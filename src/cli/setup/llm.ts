import { registerSetupModule } from "./index.js";
import {
  readConfig,
  getDefaultConfig,
  writeConfig,
  CONFIG_PATH,
} from "../../config/index.js";
import { mascot } from "../../ui/mascot.js";
import { colors as c } from "../../ui/colors.js";
import { selectWithArrows } from "../components/select.js";

type ProviderPreset = {
  name: string;
  value: string;
  defaultBaseUrl: string;
  models: string[];
};

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    name: "OpenAI",
    value: "openai",
    defaultBaseUrl: "https://api.openai.com/v1",
    models: ["gpt-5.4-mini", "gpt-5.4", "gpt-4.1-mini", "gpt-4.1"],
  },
  {
    name: "Anthropic",
    value: "anthropic",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    models: ["claude-3-7-sonnet-latest", "claude-3-5-sonnet-latest"],
  },
  {
    name: "Gemini",
    value: "gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
  },
];

registerSetupModule({
  name: "llm",
  description: "Configure LLM provider, API key, and model",
  async run(rl) {
    const config = (await readConfig()) ?? getDefaultConfig();
    const { llm } = config;
    const selectedProviderPreset =
      PROVIDER_PRESETS.find((preset) => preset.value === llm.provider) ??
      PROVIDER_PRESETS[0];

    console.log(`\n${mascot}\n`);
    console.log(`${c.bold}LLM Setup${c.reset}`);
    console.log(`${c.dim}Config saves to: ${CONFIG_PATH}${c.reset}\n`);

    const provider = await selectWithArrows(rl, "Select provider:", [
      ...PROVIDER_PRESETS.map((preset) => ({
        label: `${preset.name} ${c.dim}(${preset.value})${c.reset}`,
        value: preset,
      })),
      {
        label: "Custom provider",
        value: null,
      },
    ]);

    let providerValue = llm.provider;
    let defaultBaseUrl = llm.baseUrl || selectedProviderPreset.defaultBaseUrl;
    let modelValue = llm.model;

    if (provider) {
      providerValue = provider.value;
      defaultBaseUrl = provider.defaultBaseUrl;

      const selectedModel = await selectWithArrows(rl, "Select model:", [
        ...provider.models.map((name) => ({ label: name, value: name })),
        { label: "Custom model", value: "__custom__" },
      ]);

      if (selectedModel === "__custom__") {
        const customModelInput = (await rl.question("Custom model: ")).trim();
        if (customModelInput) {
          modelValue = customModelInput;
        }
      } else if (selectedModel) {
        modelValue = selectedModel;
      } else {
        modelValue = provider.models[0];
      }
    } else {
      const providerInput = (await rl.question(`Provider [${llm.provider}]: `)).trim();
      providerValue = providerInput || llm.provider;

      const modelInput = (await rl.question(`Model [${llm.model}]: `)).trim();
      modelValue = modelInput || llm.model;
    }

    const apiKeyInput = (
      await rl.question(
        `API key${llm.apiKey ? " (Enter to keep current)" : ""}: `,
      )
    ).trim();

    const baseUrlInput = (
      await rl.question(`Base URL [${defaultBaseUrl}]: `)
    ).trim();

    config.llm = {
      provider: providerValue,
      apiKey: apiKeyInput || llm.apiKey,
      model: modelValue,
      baseUrl: baseUrlInput || defaultBaseUrl,
    };

    if (!config.llm.apiKey) {
      console.log(`${c.red}API key is required. Run /setup llm again.${c.reset}`);
      return;
    }

    await writeConfig(config);
    console.log(`\n${c.green}LLM config saved.${c.reset}`);
    console.log(
      `${c.dim}Provider: ${config.llm.provider} | Model: ${config.llm.model}${c.reset}`,
    );
  },
});
