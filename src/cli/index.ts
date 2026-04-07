import { readConfig } from "../config/index.js";
import { runPrompt } from "../agent/index.js";
import { printHelp } from "./help.js";
import { runSetupWizard, createProjectConfigTemplate } from "./setup.js";
import { runInteractive } from "./interactive.js";

async function getOrCreateConfig() {
  const config = await readConfig();
  if (config) return config;
  console.log("No config found. Starting setup...");
  return runSetupWizard();
}

function handleError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[nightclaw] ${message}`);
  process.exit(1);
}

export async function run(argv: string[]): Promise<void> {
  const args = argv.slice(2);
  const firstArg = args[0];

  if (firstArg === "--help" || firstArg === "-h") {
    printHelp();
    return;
  }

  if (firstArg === "setup") {
    try {
      await runSetupWizard();
    } catch (error) {
      handleError(error);
    }
    return;
  }

  if (firstArg === "init-config") {
    try {
      await createProjectConfigTemplate();
    } catch (error) {
      handleError(error);
    }
    return;
  }

  if (args.length > 0) {
    try {
      const config = await getOrCreateConfig();
      await runPrompt(args.join(" "), config);
    } catch (error) {
      handleError(error);
    }
    return;
  }

  try {
    const config = await getOrCreateConfig();
    await runInteractive(config);
  } catch (error) {
    handleError(error);
  }
}
