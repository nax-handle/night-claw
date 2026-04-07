import { registerCommand } from "./index.js";
import { getSetupModule, getAllSetupModules } from "../setup/index.js";
import { colors as c } from "../../ui/colors.js";
import { selectWithArrows } from "../components/select.js";

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
    const selected = await selectWithArrows(
      rl,
      "Setup - choose a section:",
      modules.map((mod) => ({
        value: mod,
        label: `${mod.name} ${c.dim}- ${mod.description}${c.reset}`,
      })),
    );

    if (!selected) {
      console.log(`${c.red}No setup module selected.${c.reset}`);
      return;
    }
    await selected.run(rl);
  },
});
