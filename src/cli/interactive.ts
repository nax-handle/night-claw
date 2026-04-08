import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readConfig } from "../config";
import { runPrompt } from "../agent";
import { getCommand } from "./commands";
import { mascot } from "../ui/mascot";
import { colors as c } from "../ui/colors";

export async function runInteractive(): Promise<void> {
  const rl = createInterface({ input, output });

  console.log(`\n${mascot}\n`);
  console.log(`${c.bold}nightclaw${c.reset} ${c.dim}just work at night 🌙🐈‍⬛${c.reset}`);
  console.log(
    `${c.dim}Type /help for commands, or just start chatting.${c.reset}\n`,
  );

  while (true) {
    const line = await rl.question(`${c.cyan}nightclaw>${c.reset} `);
    const userInput = line.trim();
    if (!userInput) continue;
    if (userInput.startsWith("/exit")) break;

    if (userInput.startsWith("/")) {
      const parts = userInput.slice(1).split(/\s+/);
      const cmdName = parts[0];
      const cmdArgs = parts.slice(1);
      const cmd = getCommand(cmdName);

      if (cmd) {
        try {
          await cmd.run(cmdArgs, rl);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error(`${c.red}[error] ${msg}${c.reset}`);
        }
      } else {
        console.log(`${c.red}Unknown command: /${cmdName}${c.reset}`);
        console.log(`${c.dim}Type /help for available commands.${c.reset}`);
      }
      continue;
    }

    try {
      const config = await readConfig();
      if (!config) {
        console.log(
          `${c.yellow}No config found. Run /setup to get started.${c.reset}`,
        );
        continue;
      }
      await runPrompt(userInput, config);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`${c.red}[error] ${msg}${c.reset}`);
    }
  }

  rl.close();
  console.log(`\n${c.dim}Goodbye from nightclaw.${c.reset}`);
}
