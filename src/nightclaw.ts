#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
const c = {
  reset: "\x1b[0m",
  blue: "\x1b[94m",
  yellow: "\x1b[93m",
  dim: "\x1b[2m"
};
const mascot = [
  `           ${c.yellow}███${c.reset}                ${c.yellow}██${c.reset}`,
  `      ${c.yellow}██${c.reset} ${c.blue}████████${c.reset}           ${c.yellow}██${c.reset}`,
  `    ${c.yellow}██${c.reset} ${c.blue}████${c.yellow}██${c.blue}████${c.reset}    ${c.yellow}██${c.reset}   ${c.yellow}██${c.reset}`,
  `      ${c.blue}██${c.yellow}██${c.blue}████${c.yellow}██${c.blue}██${c.reset}   ${c.yellow}██${c.reset}`,
  `   ${c.blue}████████████████${c.reset}   ${c.yellow}██${c.reset}`,
  `  ${c.blue}████${c.yellow}██${c.blue}████${c.yellow}██${c.blue}████████${c.reset}`,
  `  ${c.blue}██${c.yellow}██${c.blue}██${c.yellow}██${c.blue}████${c.yellow}██${c.blue}██${c.yellow}██${c.blue}██${c.reset}   ${c.dim}nightclaw${c.reset}`,
  `  ${c.blue}████████████████${c.reset}`,
  `      ${c.blue}██${c.yellow}██${c.blue}████${c.yellow}██${c.blue}██${c.reset}`,
  `      ${c.blue}██${c.reset}  ${c.yellow}██${c.reset}  ${c.blue}██${c.reset}`
].join("\n");
type NightclawConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

const CONFIG_DIR = path.join(os.homedir(), ".nightclaw");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

function getDefaultConfig(): NightclawConfig {
  return {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: "gpt-4.1-mini",
    baseUrl: "https://api.openai.com/v1"
  };
}

async function readConfig(): Promise<NightclawConfig | null> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<NightclawConfig>;
    if (!parsed.apiKey || !parsed.model || !parsed.baseUrl) {
      return null;
    }
    return {
      apiKey: parsed.apiKey,
      model: parsed.model,
      baseUrl: parsed.baseUrl
    };
  } catch {
    return null;
  }
}

async function writeConfig(config: NightclawConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

async function runSetupWizard(): Promise<NightclawConfig> {
  const defaults = getDefaultConfig();
  const rl = createInterface({ input, output });

  console.log("Nightclaw setup wizard");
  console.log("This will save your API settings to:");
  console.log(CONFIG_PATH);
  console.log("");

  const apiKeyInput = (
    await rl.question(`${mascot}  \n OpenAI API key${defaults.apiKey ? " (press Enter to keep env key)" : ""}: `)
  ).trim();
  const modelInput = (await rl.question(`Model [${defaults.model}]: `)).trim();
  const baseUrlInput = (await rl.question(`Base URL [${defaults.baseUrl}]: `)).trim();

  rl.close();

  const config: NightclawConfig = {
    apiKey: apiKeyInput || defaults.apiKey,
    model: modelInput || defaults.model,
    baseUrl: baseUrlInput || defaults.baseUrl
  };

  if (!config.apiKey) {
    throw new Error("API key is required. Run `nightclaw setup` again.");
  }

  await writeConfig(config);
  console.log("Setup saved.");
  return config;
}

async function callLlmStreaming(prompt: string, config: NightclawConfig): Promise<string> {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      stream: true
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${text}`);
  }

  if (!response.body) {
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() || "(No response content)";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) {
        continue;
      }

      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{
            delta?: { content?: string };
            message?: { content?: string };
          }>;
        };

        const token = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? "";
        if (token) {
          fullText += token;
          process.stdout.write(token);
        }
      } catch {
        // Ignore malformed stream lines and continue.
      }
    }
  }

  return fullText.trim() || "(No response content)";
}

function printHelp(): void {


  

  console.log(`
${mascot}

nightclaw - simple AI agent CLI

Usage:
  nightclaw setup
  nightclaw "your prompt"
  nightclaw --help

Examples:
  nightclaw setup
  nightclaw "create a todo app with auth"
`);
}

async function getOrCreateConfig(): Promise<NightclawConfig> {
  const config = await readConfig();
  if (config) {
    return config;
  }
  console.log("No config found. Starting setup...");
  return runSetupWizard();
}

async function runSinglePrompt(prompt: string): Promise<void> {
  const config = await getOrCreateConfig();
  console.log(`[nightclaw] model: ${config.model}`);
  process.stdout.write("\n");
  const answer = await callLlmStreaming(prompt, config);
  if (answer === "(No response content)") {
    process.stdout.write(answer);
  }
  process.stdout.write("\n\n");
}

async function runInteractive(): Promise<void> {
  const config = await getOrCreateConfig();
  const rl = createInterface({ input, output });
  console.log("Nightclaw interactive mode");
  console.log('Type a prompt, or "exit" to quit.');
  console.log(`Using model: ${config.model}`);

  while (true) {
    const line = await rl.question("nightclaw> ");
    const userInput = line.trim();
    if (!userInput) {
      continue;
    }
    if (userInput.toLowerCase() === "exit") {
      break;
    }
    try {
      process.stdout.write("\n");
      const answer = await callLlmStreaming(userInput, config);
      if (answer === "(No response content)") {
        process.stdout.write(answer);
      }
      process.stdout.write("\n\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[nightclaw] ${message}`);
    }
  }

  rl.close();
  console.log("Goodbye from nightclaw.");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const firstArg = args[0];

  if (firstArg === "--help" || firstArg === "-h") {
    printHelp();
    return;
  }

  if (firstArg === "setup") {
    try {
      await runSetupWizard();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[nightclaw] ${message}`);
      process.exit(1);
    }
    return;
  }

  if (args.length > 0) {
    try {
      await runSinglePrompt(args.join(" "));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[nightclaw] ${message}`);
      process.exit(1);
    }
    return;
  }

  try {
    await runInteractive();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[nightclaw] ${message}`);
    process.exit(1);
  }
}

void main();
