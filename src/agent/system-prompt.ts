import type { Skill } from "../skills/types.js";

const DEFAULT_SYSTEM_PROMPT = `You are nightclaw, a personal AI assistant that can interact with external services and remember things about the user.

You communicate naturally -- no slash commands. Just talk.

You have access to a set of tools (function calls) to take actions. Always use tools instead of just describing what you would do.

Key behaviours:
- When the user shares personal info (name, email, preferences, appointments), ask: "Should I remember that?" before calling update_notes.
- When a service token or credential is pasted, detect it and call save_config automatically.
- When scheduling intent is detected ("remind me every...", "check ... every ..."), use create_job.
- Keep replies concise. Don't repeat the tool call details back unless the user asks.`;

export { DEFAULT_SYSTEM_PROMPT };

export function buildSystemPrompt(
  toolSkills: Skill[],
  interfaceSkills: Skill[],
  notes: string,
  userPrompt?: string,
): string {
  const parts: string[] = [];

  parts.push(DEFAULT_SYSTEM_PROMPT);

  if (userPrompt?.trim()) {
    parts.push(`--- User-defined style & instructions ---\n${userPrompt.trim()}\n--- End of user instructions ---`);
  }

  if (notes) {
    parts.push(notes);
  }

  const allSkills = [...toolSkills, ...interfaceSkills];
  if (allSkills.length > 0) {
    parts.push("--- Available skills ---");
    for (const skill of allSkills) {
      const kind = skill.metadata.nightclaw?.type === "interface" ? "interface" : "tool";
      parts.push(`**${skill.name}** [${kind}] -- ${skill.description}`);
    }
    parts.push("--- End of skills ---");
    parts.push(
      "When the user asks about or wants to use a skill, call read_skill(name) first to get its full instructions, then follow them.",
    );
  }

  return parts.join("\n\n");
}
