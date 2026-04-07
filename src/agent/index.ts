import type { NightclawConfig } from "../config/index.js";
import { callLlmStreaming } from "./llm.js";

export async function runPrompt(
  prompt: string,
  config: NightclawConfig,
): Promise<void> {
  console.log(`[nightclaw] model: ${config.model}`);
  process.stdout.write("\n");

  const answer = await callLlmStreaming(prompt, config);
  if (answer === "(No response content)") {
    process.stdout.write(answer);
  }

  process.stdout.write("\n\n");
}
