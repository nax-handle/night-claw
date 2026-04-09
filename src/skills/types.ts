export type SkillType = "tool" | "interface";

export type SkillInstallItem = {
  id: string;
  kind: string;
  formula?: string;
  bins?: string[];
  label?: string;
};

export type SkillNightclawMeta = {
  emoji?: string;
  requires?: { bins?: string[] };
  install?: SkillInstallItem[];
  type?: SkillType;
};

export type SkillMetadata = {
  nightclaw?: SkillNightclawMeta;
};

export type Skill = {
  name: string;
  description: string;
  homepage?: string;
  metadata: SkillMetadata;
  body: string;       // full markdown body (commands, notes, examples)
  filePath: string;   // absolute path to the SKILL.md file
};
