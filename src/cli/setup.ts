import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  type NightclawConfig,
  CONFIG_PATH,
  getDefaultConfig,
  writeConfig,
  writeProjectConfigTemplate,
  PROJECT_CONFIG_PATH,
} from "../config/index.js";
import { mascot } from "../ui/mascot.js";

export async function runSetupWizard(): Promise<NightclawConfig> {
  const defaults = getDefaultConfig();
  const rl = createInterface({ input, output });

  console.log("Nightclaw setup wizard");
  console.log("This will save your API settings to:");
  console.log(CONFIG_PATH);
  console.log("");

  const apiKeyInput = (
    await rl.question(
      `${mascot}\n OpenAI API key${defaults.apiKey ? " (press Enter to keep env key)" : ""}: `,
    )
  ).trim();
  const modelInput = (await rl.question(`Model [${defaults.model}]: `)).trim();
  const baseUrlInput = (await rl.question(`Base URL [${defaults.baseUrl}]: `)).trim();

  rl.close();

  const config: NightclawConfig = {
    apiKey: apiKeyInput || defaults.apiKey,
    model: modelInput || defaults.model,
    baseUrl: baseUrlInput || defaults.baseUrl,
  };

  if (!config.apiKey) {
    throw new Error("API key is required. Run `nightclaw setup` again.");
  }

  await writeConfig(config);
  console.log("Setup saved.");
  return config;
}

export async function createProjectConfigTemplate(): Promise<void> {
  await writeProjectConfigTemplate();
  console.log(`[nightclaw] Wrote ${PROJECT_CONFIG_PATH}`);
  console.log("[nightclaw] Fill this file, then run a prompt.");
}
