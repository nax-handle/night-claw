import fs from "node:fs/promises";
import matter from "gray-matter";
import type { Skill, SkillMetadata } from "./types.js";

export async function parseSkillFile(filePath: string): Promise<Skill | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = matter(raw);

    const name = (parsed.data.name as string | undefined) ?? "";
    const description = (parsed.data.description as string | undefined) ?? "";
    const homepage = (parsed.data.homepage as string | undefined) ?? "";
    const metadata = (parsed.data.metadata as SkillMetadata | undefined) ?? {};

    if (!name) return null;

    return {
      name,
      description,
      homepage,
      metadata,
      body: parsed.content.trim(),
      filePath,
    };
  } catch {
    return null;
  }
}
