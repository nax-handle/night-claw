import type { AgentSession } from "../agent/index.js";
import type { NightclawConfig, ServiceType } from "../config/index.js";
import { getServiceConfig } from "../config/index.js";
import { telegramAdapter } from "../skills/telegram/adapter.js";
import { zaloAdapter } from "../skills/zalo/adapter.js";
import { colors as c } from "../ui/colors.js";

type ServiceStatus = "running" | "stopped";

const serviceStatuses = new Map<string, ServiceStatus>();

const adapters = {
  telegram: telegramAdapter,
  zalo: zaloAdapter,
} as const;

type AdapterKey = keyof typeof adapters;

export function createServiceManager(
  session: AgentSession,
  config: NightclawConfig,
  onOutput: (text: string) => void,
) {
  return {
    async start(service: string): Promise<string> {
      const s = service.toLowerCase() as AdapterKey;

      if (s === "zalo") {
        const svcConfig = getServiceConfig(config.services, "zalo");
        if (!svcConfig?.cookie) {
          return await new Promise<string>((resolve) => {
            void zaloAdapter
              .loginWithQR((qrPath, displayName) => {
                if (displayName) {
                  onOutput(`\n${c.green}[zalo] Scanned by ${displayName}${c.reset}\n`);
                } else {
                  onOutput(
                    `\n${c.cyan}[zalo] QR code saved to ${qrPath}${c.reset}\n` +
                    `Open ${qrPath} and scan it with your Zalo app.\n`,
                  );
                }
              }, config)
              .then(resolve);
          });
        }
      }

      const adapter = adapters[s];
      if (!adapter) {
        return `Unknown service: ${service}. Available: ${Object.keys(adapters).join(", ")}`;
      }

      const result = await adapter.start(session, config);
      serviceStatuses.set(s, adapter.isRunning() ? "running" : "stopped");
      return result;
    },

    async stop(service: string): Promise<string> {
      const s = service.toLowerCase() as AdapterKey;
      const adapter = adapters[s];
      if (!adapter) return `Unknown service: ${service}`;
      const result = await adapter.stop();
      serviceStatuses.set(s, "stopped");
      return result;
    },

    list(): string {
      const lines = Object.entries(adapters).map(([name, adapter]) => {
        const status = adapter.isRunning()
          ? `${c.green}running${c.reset}`
          : `${c.dim}stopped${c.reset}`;
        return `  ${name}: ${status}`;
      });
      return `Services:\n${lines.join("\n")}`;
    },

    async startAll(): Promise<string[]> {
      const results: string[] = [];
      for (const entry of config.services ?? []) {
        const adapter = adapters[entry.type as AdapterKey];
        if (!adapter) continue;
        const result = await this.start(entry.type);
        results.push(`[${entry.type}] ${result}`);
      }
      return results;
    },

    async stopAll(): Promise<void> {
      for (const [name, adapter] of Object.entries(adapters)) {
        if (adapter.isRunning()) {
          await adapter.stop();
          serviceStatuses.set(name, "stopped");
        }
      }
    },

    configuredServices(): ServiceType[] {
      return (config.services ?? []).map((s) => s.type);
    },
  };
}
