import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_SECTIONS = [
  "About You",
  "How You Like Things",
  "People You Talk About",
  "Things Going On",
  "What Happened Last Time",
];

export type ClaudeSection = {
  title: string;
  content: string;
};

export type ClaudeState = {
  sections: ClaudeSection[];
  raw: string;
};

function getClaudeMdPath(): string {
  return path.join(process.cwd(), "CLAUDE.md");
}

export async function readClaudeState(): Promise<ClaudeState> {
  try {
    const raw = await fs.readFile(getClaudeMdPath(), "utf8");
    return { sections: parseSections(raw), raw };
  } catch {
    return { sections: [], raw: "" };
  }
}

function parseSections(raw: string): ClaudeSection[] {
  const sections: ClaudeSection[] = [];
  // Split on ## headings
  const parts = raw.split(/^## /m);
  for (const part of parts.slice(1)) {
    const newline = part.indexOf("\n");
    if (newline === -1) continue;
    const title = part.slice(0, newline).trim();
    const content = part.slice(newline + 1).trim();
    if (title) sections.push({ title, content });
  }
  return sections;
}

function buildRaw(sections: ClaudeSection[]): string {
  let out = "# Nightclaw\n\n";
  for (const sec of sections) {
    out += `## ${sec.title}\n${sec.content}\n\n`;
  }
  return out.trimEnd() + "\n";
}

export async function writeSection(
  title: string,
  content: string,
): Promise<void> {
  const state = await readClaudeState();
  const existing = state.sections.find((s) => s.title === title);
  if (existing) {
    existing.content = content;
  } else {
    state.sections.push({ title, content });
  }
  await fs.writeFile(getClaudeMdPath(), buildRaw(state.sections), "utf8");
}

export async function appendToSection(
  title: string,
  content: string,
): Promise<void> {
  const state = await readClaudeState();
  const existing = state.sections.find((s) => s.title === title);
  if (existing) {
    existing.content = existing.content
      ? existing.content + "\n" + content
      : content;
  } else {
    state.sections.push({ title, content });
  }
  await fs.writeFile(getClaudeMdPath(), buildRaw(state.sections), "utf8");
}

export async function deleteSection(title: string): Promise<void> {
  const state = await readClaudeState();
  state.sections = state.sections.filter((s) => s.title !== title);
  await fs.writeFile(getClaudeMdPath(), buildRaw(state.sections), "utf8");
}

export async function clearAllSections(): Promise<void> {
  await fs.writeFile(getClaudeMdPath(), "# Nightclaw\n", "utf8");
}

export async function getNotesForPrompt(): Promise<string> {
  const state = await readClaudeState();
  if (state.sections.length === 0) return "";

  // Filter out the Jobs section (handled by scheduler separately)
  const noteSections = state.sections.filter((s) => s.title !== "Jobs");
  if (noteSections.length === 0) return "";

  let out = "--- Your notes about the user ---\n";
  for (const sec of noteSections) {
    out += `\n### ${sec.title}\n${sec.content}\n`;
  }
  out += "\n--- End of notes ---";
  return out;
}

export async function ensureDefaultStructure(): Promise<void> {
  const state = await readClaudeState();
  if (state.sections.length > 0) return;
  // Write a blank structure so the AI has section names to work with
  const sections: ClaudeSection[] = DEFAULT_SECTIONS.map((title) => ({
    title,
    content: "",
  }));
  await fs.writeFile(getClaudeMdPath(), buildRaw(sections), "utf8");
}
