import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { NightclawConfig } from "../config/index.js";
import { readConfig, patchServiceConfig, patchLlmConfig, patchPromptConfig, getServiceConfig } from "../config/index.js";
import type { ServiceType } from "../config/index.js";
import { loadAllSkills, getToolSkills, getInterfaceSkills } from "../skills/registry.js";
import type { Skill } from "../skills/types.js";
import { buildSystemPrompt } from "./system-prompt.js";
import { callLlm } from "./llm.js";
import type { ChatMessage, ToolCall } from "./llm.js";
import { AGENT_TOOLS } from "./tools.js";
import { getNotesForPrompt } from "../state/claude-md.js";
import { updateNotes } from "../state/memory.js";

const execFileAsync = promisify(execFile);

const MAX_HISTORY = 20;

export type AgentSession = {
  messages: ChatMessage[];
  skills: Skill[];
  systemPrompt: string;
  askApproval: (question: string) => Promise<boolean>;
  onOutput: (text: string) => void;
  serviceManager?: {
    start: (service: string) => Promise<string>;
    stop: (service: string) => Promise<string>;
    list: () => string;
  };
  jobManager?: {
    create: (params: Record<string, string>) => Promise<string>;
    list: () => string;
    cancel: (jobId: string) => string;
  };
};

export async function createSession(
  config: NightclawConfig,
  options: Pick<AgentSession, "askApproval" | "onOutput" | "serviceManager" | "jobManager">,
): Promise<AgentSession> {
  const skills = await loadAllSkills();
  const toolSkills = getToolSkills(skills);
  const interfaceSkills = getInterfaceSkills(skills);
  const notes = await getNotesForPrompt();
  const systemPrompt = buildSystemPrompt(toolSkills, interfaceSkills, notes, config.prompt?.system);
  console.log("systemPrompt", systemPrompt);
  return {
    messages: [],
    skills,
    systemPrompt,
    ...options,
  };
}

export async function runTurn(
  userInput: string,
  session: AgentSession,
  config: NightclawConfig,
): Promise<string> {
  session.messages.push({ role: "user", content: userInput });

  // Keep history bounded
  if (session.messages.length > MAX_HISTORY) {
    session.messages = session.messages.slice(-MAX_HISTORY);
  }

  const allMessages: ChatMessage[] = [
    { role: "system", content: session.systemPrompt },
    ...session.messages,
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 8;
  let finalContent = "";

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const response = await callLlm(allMessages, config.llm, AGENT_TOOLS, false);

    if (response.toolCalls.length === 0) {
      // No tool calls -- this is the final answer
      finalContent = response.content ?? "";
      session.messages.push({ role: "assistant", content: finalContent });
      return finalContent;
    }

    // Add the assistant message with tool calls to context
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: response.content,
      tool_calls: response.toolCalls,
    };
    allMessages.push(assistantMsg);

    // Execute each tool call and collect results
    for (const toolCall of response.toolCalls) {
      let toolResult: string;
      try {
        toolResult = await executeToolCall(toolCall, session, config);
      } catch (err) {
        toolResult = `Error: ${err instanceof Error ? err.message : String(err)}`;
      }

      // Stream tool result indicator to user
      session.onOutput(`\n⚡ ${toolCall.function.name}\n`);

      allMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResult,
        name: toolCall.function.name,
      });
    }
  }

  finalContent = "Reached maximum tool iterations.";
  session.messages.push({ role: "assistant", content: finalContent });
  return finalContent;
}


async function executeToolCall(
  toolCall: ToolCall,
  session: AgentSession,
  config: NightclawConfig,
): Promise<string> {
  const name = toolCall.function.name;
  let args: Record<string, string> = {};
  try {
    args = JSON.parse(toolCall.function.arguments) as Record<string, string>;
  } catch {
    // empty args
  }

  switch (name) {
    case "save_config": {
      const { service, key, value } = args;
      if (!service || !key || !value) return "Missing required fields.";
      if (service === "llm") {
        await patchLlmConfig({ [key]: value } as Partial<import("../config/index.js").LlmConfig>);
        return `Saved llm.${key} to config.`;
      }
      if (service === "prompt") {
        await patchPromptConfig({ [key]: value } as Partial<import("../config/index.js").PromptConfig>);
        return `Saved prompt.${key} to config. Restart nightclaw for the new prompt to take effect.`;
      }
      await patchServiceConfig(
        service as ServiceType,
        { [key]: value },
      );
      return `Saved ${service}.${key} to config.`;
    }

    case "read_config": {
      const cfg = await readConfig();
      if (!cfg) return "No config found.";
      const { service } = args;
      if (service === "llm") {
        return JSON.stringify({ ...cfg.llm, apiKey: "***" }, null, 2);
      }
      if (service === "prompt") {
        return JSON.stringify(cfg.prompt ?? {}, null, 2);
      }
      if (service && cfg.services) {
        const svc = getServiceConfig(cfg.services, service as ServiceType);
        return svc ? JSON.stringify(svc, null, 2) : `No config for ${service}.`;
      }
      const safe = { llm: { ...cfg.llm, apiKey: "***" }, prompt: cfg.prompt, services: cfg.services };
      return JSON.stringify(safe, null, 2);
    }

    case "run_shell": {
      const { command, reason, requireApproval } = args;
      if (!command) return "No command provided.";

      const needsApproval = requireApproval !== "false";
      if (needsApproval) {
        const approved = await session.askApproval(
          `Run: ${command}\nReason: ${reason ?? ""}`,
        );
        if (!approved) return "User declined to run the command.";
      }

      try {
        const parts = command.split(/\s+/);
        const bin = parts[0] ?? "";
        const cmdArgs = parts.slice(1);
        const { stdout, stderr } = await execFileAsync(bin, cmdArgs, {
          timeout: 30000,
          shell: true,
        });
        return (stdout + stderr).trim() || "(no output)";
      } catch (err) {
        return `Command failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    case "start_service": {
      const { service } = args;
      if (!service) return "No service specified.";
      if (session.serviceManager) {
        return await session.serviceManager.start(service);
      }
      return `Service manager not available.`;
    }

    case "stop_service": {
      const { service } = args;
      if (!service) return "No service specified.";
      if (session.serviceManager) {
        return await session.serviceManager.stop(service);
      }
      return `Service manager not available.`;
    }

    case "list_services": {
      if (session.serviceManager) {
        return session.serviceManager.list();
      }
      return "No services running.";
    }

    case "create_job": {
      if (session.jobManager) {
        return await session.jobManager.create(args);
      }
      return "Job manager not available.";
    }

    case "list_jobs": {
      if (session.jobManager) {
        return session.jobManager.list();
      }
      return "No jobs scheduled.";
    }

    case "cancel_job": {
      const { jobId } = args;
      if (!jobId) return "No job id provided.";
      if (session.jobManager) {
        return session.jobManager.cancel(jobId);
      }
      return "Job manager not available.";
    }

    case "update_notes": {
      const { section, content, action } = args;
      if (!section || !content || !action) return "Missing required fields.";
      return await updateNotes(
        section,
        content,
        action as "rewrite" | "append" | "delete",
      );
    }

    case "read_state": {
      return await getNotesForPrompt() || "No notes yet.";
    }

    case "read_skill": {
      const { name: skillName } = args;
      if (!skillName) return "No skill name provided.";
      const skill = session.skills.find(
        (s) => s.name.toLowerCase() === skillName.toLowerCase(),
      );
      if (!skill) return `Skill '${skillName}' not found. Available: ${session.skills.map((s) => s.name).join(", ")}`;
      return `# ${skill.name}\n${skill.description}\n\n${skill.body}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// Legacy single-prompt entry point
export async function runPrompt(
  prompt: string,
  config: NightclawConfig,
): Promise<void> {
  console.log(`[nightclaw] model: ${config.llm.model}`);
  process.stdout.write("\n");

  const session = await createSession(config, {
    askApproval: async () => false,
    onOutput: (t) => process.stdout.write(t),
  });

  const answer = await runTurn(prompt, session, config);
  if (answer) {
    process.stdout.write(answer);
  }
  process.stdout.write("\n\n");
}
