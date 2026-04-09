import fs from "node:fs/promises";
import path from "node:path";
import { parseSkillFile } from "./parser.js";
import type { Skill } from "./types.js";

export async function loadAllSkills(): Promise<Skill[]> {
  const skillsDir = path.resolve(
    path.join(process.cwd(), "src", "skills"),
  );

  let entries: string[];
  try {
    const dirents = await fs.readdir(skillsDir, { withFileTypes: true });
    entries = dirents
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }

  const skills: Skill[] = [];
  for (const dir of entries) {
    const skillMdPath = path.join(skillsDir, dir, "SKILL.md");
    const skill = await parseSkillFile(skillMdPath);
    if (skill) skills.push(skill);
  }

  return skills;
}

export function getToolSkills(skills: Skill[]): Skill[] {
  return skills.filter(
    (s) => !s.metadata.nightclaw?.type || s.metadata.nightclaw.type === "tool",
  );
}

export function getInterfaceSkills(skills: Skill[]): Skill[] {
  return skills.filter(
    (s) => s.metadata.nightclaw?.type === "interface",
  );
}
