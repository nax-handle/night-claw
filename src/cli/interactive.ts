import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readConfig } from "../config/index.js";
import { createSession, runTurn } from "../agent/index.js";
import { ensureDefaultStructure, writeSection } from "../state/claude-md.js";
import { createServiceManager } from "../services/manager.js";
import {
  startScheduler,
  createJobManager,
} from "../scheduler/index.js";
import { getCommand } from "./commands/index.js";
import { mascot } from "../ui/mascot.js";
import { colors as c } from "../ui/colors.js";

export async function runInteractive(): Promise<void> {
  const rl = createInterface({ input, output });

  console.log(`\n${mascot}\n`);
  console.log(`${c.bold}nightclaw${c.reset} ${c.dim}just work at night 🌙🐈‍⬛${c.reset}`);
  console.log(`${c.dim}Just chat naturally. Type /exit to quit.${c.reset}\n`);

  const config = await readConfig();
  if (!config) {
    console.log(
      `${c.yellow}No LLM config found. Run /setup llm to get started.${c.reset}\n`,
    );
  }

  // Ensure CLAUDE.md exists with default sections
  await ensureDefaultStructure();

  // Build session with all tools wired
  const session = config
    ? await createSession(config, {
        askApproval: async (question: string) => {
          const answer = await rl.question(
            `\n${c.yellow}[approval needed]${c.reset} ${question}\nProceed? (y/n): `,
          );
          return answer.trim().toLowerCase().startsWith("y");
        },
        onOutput: (text: string) => {
          process.stdout.write(`${c.dim}${text}${c.reset}`);
        },
      })
    : null;

  if (session && config) {
    // Wire service manager into session
    const serviceManager = createServiceManager(session, config, (text) => {
      process.stdout.write(text);
    });
    session.serviceManager = serviceManager;

    // Wire job manager into session
    session.jobManager = createJobManager();

    // Start scheduler
    const tickMs = config.scheduler?.tickIntervalMs ?? 60_000;
    await startScheduler(session, config, tickMs);

    // Auto-start all configured services
    const startResults = await serviceManager.startAll();
    for (const line of startResults) {
      console.log(`${c.green}${line}${c.reset}`);
    }
  }

  while (true) {
    const line = await rl.question(`\n${c.cyan}you>${c.reset} `);
    const userInput = line.trim();
    if (!userInput) continue;
    if (userInput === "/exit" || userInput === "/quit") break;

    // Legacy /setup llm still works for initial LLM configuration
    if (userInput.startsWith("/setup")) {
      const cmd = getCommand("setup");
      if (cmd) {
        try {
          await cmd.run(userInput.slice(7).trim().split(/\s+/).filter(Boolean), rl);
        } catch (err) {
          console.error(`${c.red}[error] ${err instanceof Error ? err.message : String(err)}${c.reset}`);
        }
      }
      continue;
    }

    // Re-read config after potential /setup
    const currentConfig = await readConfig();
    if (!currentConfig) {
      console.log(
        `${c.yellow}No LLM config yet. Type /setup to configure your AI model first.${c.reset}`,
      );
      continue;
    }

    // If session wasn't created (no config at startup), create it now
    const activeSession = session ?? await createSession(currentConfig, {
      askApproval: async (question: string) => {
        const answer = await rl.question(
          `\n${c.yellow}[approval needed]${c.reset} ${question}\nProceed? (y/n): `,
        );
        return answer.trim().toLowerCase().startsWith("y");
      },
      onOutput: (text: string) => {
        process.stdout.write(`${c.dim}${text}${c.reset}`);
      },
    });

    try {
      process.stdout.write(`\n${c.bold}nightclaw>${c.reset} `);
      const reply = await runTurn(userInput, activeSession, currentConfig);
      if (reply) {
        process.stdout.write(reply);
      }
      process.stdout.write("\n");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n${c.red}[error] ${msg}${c.reset}`);
    }
  }

  // On exit: summarize session to CLAUDE.md
  if (session && session.messages.length > 2 && config) {
    try {
      const summaryPrompt =
        "Summarize this conversation in 2-3 sentences for my memory notebook. Focus on what the user did, asked for, and anything important that happened. Be concise and write in third person.";
      const summarySession = await createSession(config, {
        askApproval: async () => false,
        onOutput: () => { /* silent */ },
      });
      summarySession.messages = [...session.messages];
      const summary = await runTurn(summaryPrompt, summarySession, config);
      if (summary && summary.length > 10) {
        await writeSection("What Happened Last Time", summary);
      }
    } catch {
      // Don't fail on summary errors
    }
  }

  rl.close();
  console.log(`\n${c.dim}Goodbye from nightclaw.${c.reset}\n`);
}
