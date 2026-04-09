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

  // nightclaw serve -- start all configured services as daemon
  if (firstArg === "serve") {
    await runServe();
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

async function runServe(): Promise<void> {
  const { createSession } = await import("../agent/index.js");
  const { createServiceManager } = await import("../services/manager.js");
  const { ensureDefaultStructure } = await import("../state/claude-md.js");
  const { colors: col } = await import("../ui/colors.js");

  console.log(`${col.bold}nightclaw serve${col.reset} -- starting services...\n`);

  const config = await readConfig();
  if (!config) {
    console.log(`${col.yellow}No config found. Run nightclaw first and use /setup.${col.reset}`);
    process.exit(1);
  }

  await ensureDefaultStructure();

  const session = await createSession(config, {
    askApproval: async () => true, // auto-approve in serve mode
    onOutput: (text) => process.stdout.write(text),
  });

  const manager = createServiceManager(session, config, (text) => process.stdout.write(text));
  session.serviceManager = manager;

  const { startScheduler, createJobManager } = await import("../scheduler/index.js");
  session.jobManager = createJobManager();
  await startScheduler(session, config, config.scheduler?.tickIntervalMs ?? 60_000);

  const startResults = await manager.startAll();
  for (const line of startResults) {
    console.log(`${col.green}${line}${col.reset}`);
  }

  const configured = manager.configuredServices();
  if (configured.length === 0) {
    console.log(
      `${col.yellow}No services configured yet. Start nightclaw and tell it to set up Telegram or Zalo.${col.reset}`,
    );
    process.exit(0);
  }

  console.log(`\n${col.dim}Running: ${configured.join(", ")}. Press Ctrl+C to stop.${col.reset}\n`);

  // Keep process alive
  process.on("SIGINT", async () => {
    console.log(`\n${col.dim}Shutting down...${col.reset}`);
    await manager.stopAll();
    process.exit(0);
  });

  // Prevent Node from exiting
  setInterval(() => { /* heartbeat */ }, 60_000);
}
