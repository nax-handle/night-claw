import { registerSetupModule } from "./index.js";
import {
  readConfig,
  getDefaultConfig,
  writeConfig,
  CONFIG_PATH,
} from "../../config/index.js";
import { mascot } from "../../ui/mascot.js";
import { colors as c } from "../../ui/colors.js";

registerSetupModule({
  name: "llm",
  description: "Configure LLM provider, API key, and model",
  async run(rl) {
    const config = (await readConfig()) ?? getDefaultConfig();
    const { llm } = config;

    console.log(`\n${mascot}\n`);
    console.log(`${c.bold}LLM Setup${c.reset}`);
    console.log(`${c.dim}Config saves to: ${CONFIG_PATH}${c.reset}\n`);

    const providerInput = (
      await rl.question(`Provider [${llm.provider}]: `)
    ).trim();

    const apiKeyInput = (
      await rl.question(
        `API key${llm.apiKey ? " (Enter to keep current)" : ""}: `,
      )
    ).trim();

    const modelInput = (
      await rl.question(`Model [${llm.model}]: `)
    ).trim();

    const baseUrlInput = (
      await rl.question(`Base URL [${llm.baseUrl}]: `)
    ).trim();

    config.llm = {
      provider: providerInput || llm.provider,
      apiKey: apiKeyInput || llm.apiKey,
      model: modelInput || llm.model,
      baseUrl: baseUrlInput || llm.baseUrl,
    };

    if (!config.llm.apiKey) {
      console.log(`${c.red}API key is required. Run /setup llm again.${c.reset}`);
      return;
    }

    await writeConfig(config);
    console.log(`\n${c.green}LLM config saved.${c.reset}`);
  },
});
