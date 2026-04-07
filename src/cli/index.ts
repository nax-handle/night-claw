import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readConfig } from "../config/index.js";
import { runPrompt } from "../agent/index.js";
import { runInteractive } from "./interactive.js";
import { getCommand } from "./commands/index.js";
import { colors as c } from "../ui/colors.js";

function handleError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${c.red}[nightclaw] ${message}${c.reset}`);
  process.exit(1);
}

export async function run(argv: string[]): Promise<void> {
  const args = argv.slice(2);
  const firstArg = args[0];

  if (firstArg === "--help" || firstArg === "-h") {
    const help = getCommand("help");
    if (help) {
      const rl = createInterface({ input, output });
      await help.run([], rl);
      rl.close();
    }
    return;
  }

  if (args.length > 0) {
    try {
      const config = await readConfig();
      if (!config) {
        console.log(
          `${c.yellow}No config found. Run: nightclaw then /setup${c.reset}`,
        );
        process.exit(1);
      }
      await runPrompt(args.join(" "), config);
    } catch (error) {
      handleError(error);
    }
    return;
  }

  try {
    await runInteractive();
  } catch (error) {
    handleError(error);
  }
}
