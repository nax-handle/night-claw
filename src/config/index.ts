import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type NightclawConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

export const CONFIG_DIR = path.join(os.homedir(), ".nightclaw");
export const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
export const PROJECT_CONFIG_PATH = path.join(process.cwd(), "nightclaw.config.json");

export function getDefaultConfig(): NightclawConfig {
  return {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: "gpt-4.1-mini",
    baseUrl: "https://api.openai.com/v1",
  };
}

function parseConfig(raw: string): NightclawConfig | null {
  const parsed = JSON.parse(raw) as Partial<NightclawConfig>;
  if (!parsed.apiKey || !parsed.model || !parsed.baseUrl) {
    return null;
  }
  return {
    apiKey: parsed.apiKey,
    model: parsed.model,
    baseUrl: parsed.baseUrl,
  };
}

async function readConfigFromPath(configPath: string): Promise<NightclawConfig | null> {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return parseConfig(raw);
  } catch {
    return null;
  }
}

export async function readConfig(): Promise<NightclawConfig | null> {
  const projectConfig = await readConfigFromPath(PROJECT_CONFIG_PATH);
  if (projectConfig) {
    return projectConfig;
  }
  return readConfigFromPath(CONFIG_PATH);
}

export async function writeConfig(config: NightclawConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

export async function writeProjectConfigTemplate(): Promise<void> {
  const template: NightclawConfig = {
    apiKey: "paste-your-api-key-here",
    model: "gpt-4.1-mini",
    baseUrl: "https://api.openai.com/v1",
  };
  await fs.writeFile(PROJECT_CONFIG_PATH, JSON.stringify(template, null, 2), "utf8");
}
