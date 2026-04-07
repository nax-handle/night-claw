import { registerCommand, getAllCommands } from "./index.js";
import { mascot } from "../../ui/mascot.js";
import { colors as c } from "../../ui/colors.js";

registerCommand({
  name: "help",
  description: "Show available commands",
  async run() {
    console.log(`\n${mascot}\n`);
    console.log(`${c.bold}nightclaw${c.reset} - AI agent CLI\n`);
    console.log(`${c.bold}Commands:${c.reset}`);
    for (const cmd of getAllCommands()) {
      console.log(
        `  ${c.cyan}/${cmd.name}${c.reset}  ${c.dim}${cmd.description}${c.reset}`,
      );
    }
    console.log(
      `\n  Type anything else to chat with the AI.\n  Type ${c.cyan}exit${c.reset} to quit.\n`,
    );
  },
});
