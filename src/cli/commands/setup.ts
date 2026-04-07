import { registerCommand } from "./index.js";
import { getSetupModule, getAllSetupModules } from "../setup/index.js";
import { colors as c } from "../../ui/colors.js";

registerCommand({
  name: "setup",
  description: "Configure nightclaw settings",
  async run(args, rl) {
    if (args.length > 0) {
      const mod = getSetupModule(args[0]);
      if (!mod) {
        console.log(`${c.red}Unknown setup module: ${args[0]}${c.reset}`);
        const names = getAllSetupModules()
          .map((m) => m.name)
          .join(", ");
        console.log(`Available: ${names}`);
        return;
      }
      await mod.run(rl);
      return;
    }

    const modules = getAllSetupModules();
    console.log(`\n${c.bold}Setup - choose a section:${c.reset}\n`);
    modules.forEach((mod, i) => {
      console.log(
        `  ${c.cyan}${i + 1}${c.reset}) ${mod.name} ${c.dim}- ${mod.description}${c.reset}`,
      );
    });
    console.log("");

    const choice = (
      await rl.question(`${c.bold}Select (1-${modules.length}): ${c.reset}`)
    ).trim();

    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= modules.length) {
      console.log(`${c.red}Invalid choice.${c.reset}`);
      return;
    }

    await modules[idx].run(rl);
  },
});
