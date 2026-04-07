import fs from "node:fs/promises";
import path from "node:path";

export type LlmConfig = {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
};

export type NightclawConfig = {
  llm: LlmConfig;
};

export const CONFIG_PATH = path.join(process.cwd(), "nightclaw.config.json");

export function getDefaultConfig(): NightclawConfig {
  return {
    llm: {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY ?? "",
      model: "gpt-4.1-mini",
      baseUrl: "https://api.openai.com/v1",
    },
  };
}

export async function readConfig(): Promise<NightclawConfig | null> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<NightclawConfig>;
    if (!parsed.llm?.apiKey || !parsed.llm?.model || !parsed.llm?.baseUrl) {
      return null;
    }
    return parsed as NightclawConfig;
  } catch {
    return null;
  }
}

export async function writeConfig(config: NightclawConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

export async function patchConfig(
  patch: Partial<NightclawConfig>,
): Promise<NightclawConfig> {
  const existing = (await readConfig()) ?? getDefaultConfig();
  const merged = { ...existing, ...patch };
  await writeConfig(merged);
  return merged;
}
