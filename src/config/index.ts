import fs from "node:fs/promises";
import path from "node:path";

export type LlmConfig = {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
};

export type ServiceType = "telegram" | "zalo" | "gog";

export type ServiceEntry = {
  type: ServiceType;
  config: Record<string, string>;
};

export type StateConfig = {
  autoSave?: boolean;
  claudeMdPath?: string;
};

export type SchedulerConfig = {
  enabled?: boolean;
  tickIntervalMs?: number;
  maxConcurrentJobs?: number;
};

export type PromptConfig = {
  system?: string;
};

export type NightclawConfig = {
  llm: LlmConfig;
  prompt?: PromptConfig;
  services?: ServiceEntry[];
  state?: StateConfig;
  scheduler?: SchedulerConfig;
};

export function getServiceConfig(
  services: ServiceEntry[] | undefined,
  type: ServiceType,
): Record<string, string> | undefined {
  return services?.find((s) => s.type === type)?.config;
}

export const CONFIG_PATH = path.join(process.cwd(), "nightclaw.config.json");

export function getDefaultConfig(): NightclawConfig {
  return {
    llm: {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY ?? "",
      model: "gpt-4.1-mini",
      baseUrl: "https://api.openai.com/v1",
    },
    services: [],
    state: {
      autoSave: true,
      claudeMdPath: "./CLAUDE.md",
    },
    scheduler: {
      enabled: true,
      tickIntervalMs: 60000,
      maxConcurrentJobs: 3,
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

export async function patchPromptConfig(
  values: Partial<PromptConfig>,
): Promise<NightclawConfig> {
  const existing = (await readConfig()) ?? getDefaultConfig();
  existing.prompt = { ...existing.prompt, ...values };
  await writeConfig(existing);
  return existing;
}

export async function patchLlmConfig(
  values: Partial<LlmConfig>,
): Promise<NightclawConfig> {
  const existing = (await readConfig()) ?? getDefaultConfig();
  existing.llm = { ...existing.llm, ...values };
  await writeConfig(existing);
  return existing;
}

export async function patchServiceConfig(
  service: ServiceType,
  values: Record<string, string>,
): Promise<NightclawConfig> {
  const existing = (await readConfig()) ?? getDefaultConfig();
  const services = existing.services ?? [];
  const idx = services.findIndex((s) => s.type === service);
  if (idx >= 0) {
    services[idx]!.config = { ...services[idx]!.config, ...values };
  } else {
    services.push({ type: service, config: values });
  }
  existing.services = services;
  await writeConfig(existing);
  return existing;
}
