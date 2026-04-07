import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { NightclawConfig } from "../config/index.js";
import { runPrompt } from "../agent/index.js";

export async function runInteractive(config: NightclawConfig): Promise<void> {
  const rl = createInterface({ input, output });

  console.log("Nightclaw interactive mode");
  console.log('Type a prompt, or "exit" to quit.');
  console.log(`Using model: ${config.model}`);

  while (true) {
    const line = await rl.question("nightclaw> ");
    const userInput = line.trim();
    if (!userInput) continue;
    if (userInput.toLowerCase() === "exit") break;

    try {
      await runPrompt(userInput, config);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[nightclaw] ${message}`);
    }
  }

  rl.close();
  console.log("Goodbye from nightclaw.");
}
