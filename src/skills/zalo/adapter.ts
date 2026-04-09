import { Zalo, LoginQRCallbackEventType, ThreadType } from "zca-js";
import type { API, Message } from "zca-js";
import type { LoginQRCallbackEvent } from "zca-js";
import fs from "node:fs/promises";
import qrcodeTerminal from "qrcode-terminal";
import type { AgentSession } from "../../agent/index.js";
import { runTurn } from "../../agent/index.js";
import type { NightclawConfig } from "../../config/index.js";
import { getServiceConfig, patchServiceConfig } from "../../config/index.js";
import { colors as c } from "../../ui/colors.js";

export type ZaloAdapter = {
  name: "zalo";
  start: (session: AgentSession, config: NightclawConfig) => Promise<string>;
  stop: () => Promise<string>;
  sendMessage: (threadId: string, text: string, type?: typeof ThreadType.User | typeof ThreadType.Group) => Promise<void>;
  isRunning: () => boolean;
  loginWithQR: (
    onQR: (qrPath: string, displayName?: string) => void,
    config: NightclawConfig,
  ) => Promise<string>;
};

let api: API | null = null;
let running = false;

/**
 * Extract plain text from a zca-js Message object.
 * message.data.content is string for plain text, or an object with msg for rich text.
 */
function extractText(message: Message): string {
  const content = message.data.content;
  if (typeof content === "string") return content;
  if (content && typeof content === "object" && "msg" in content) {
    return (content as { msg?: string }).msg ?? "";
  }
  return "";
}

function startListener(
  zaloApi: API,
  session: AgentSession,
  config: NightclawConfig,
): void {
  zaloApi.listener.on("message", (message: Message) => {
    // Skip own messages (isSelf = true when uidFrom == "0")
    if (message.isSelf) return;

    const text = extractText(message);
    if (!text.trim()) return;

    const senderName = String(message.data.uidFrom ?? "unknown");
    const isGroup = message.type === ThreadType.Group;

    console.log(
      `\n${c.cyan}[zalo${isGroup ? " group" : ""}]${c.reset} ${c.dim}${senderName}:${c.reset} ${text}`,
    );

    // Run through agent and reply to the same thread
    void runTurn(text, session, config)
      .then(async (reply) => {
        if (!reply || !api) return;
        try {
          await api.sendMessage(reply, message.threadId, message.type);
        } catch (err) {
          console.error(`${c.red}[zalo] send failed:${c.reset}`, err);
        }
      })
      .catch((err: unknown) => {
        console.error(`${c.red}[zalo error]${c.reset}`, err);
      });
  });

  zaloApi.listener.on("disconnected", (code, reason) => {
    console.log(
      `${c.yellow}[zalo] disconnected (code ${code}): ${reason}${c.reset}`,
    );
    running = false;
  });

  zaloApi.listener.on("error", (err) => {
    console.error(`${c.red}[zalo listener error]${c.reset}`, err);
  });

  zaloApi.listener.start({ retryOnClose: true });
}

export const zaloAdapter: ZaloAdapter = {
  name: "zalo",

  async start(session: AgentSession, config: NightclawConfig): Promise<string> {
    if (running) return "Zalo bot is already running.";

    const cookieStr = getServiceConfig(config.services, "zalo")?.cookie;
    if (!cookieStr) {
      return "No Zalo cookie saved. Tell me to login with QR code first.";
    }

    try {
      const credentials = JSON.parse(cookieStr) as {
        imei: string;
        cookie: import("zca-js").Cookie[];
        userAgent: string;
      };

      const zalo = new Zalo();
      const zaloApi = await zalo.login(credentials);
      api = zaloApi;
      running = true;

      startListener(zaloApi, session, config);

      const ownId = zaloApi.getOwnId();
      return `Zalo bot running! Logged in as UID ${ownId}. Now listening for messages in private chats and groups.`;
    } catch (err) {
      running = false;
      api = null;
      return `Failed to start Zalo bot: ${err instanceof Error ? err.message : String(err)}`;
    }
  },

  async stop(): Promise<string> {
    if (!running || !api) return "Zalo bot is not running.";
    try {
      api.listener.stop();
      api = null;
      running = false;
      return "Zalo bot stopped.";
    } catch (err) {
      return `Error stopping Zalo bot: ${err instanceof Error ? err.message : String(err)}`;
    }
  },

  async sendMessage(
    threadId: string,
    text: string,
    type: typeof ThreadType.User | typeof ThreadType.Group = ThreadType.User,
  ): Promise<void> {
    if (!api) throw new Error("Zalo bot is not running.");
    await api.sendMessage(text, threadId, type);
  },

  isRunning(): boolean {
    return running;
  },

  async loginWithQR(
    onQR: (qrPath: string, displayName?: string) => void,
    config: NightclawConfig,
  ): Promise<string> {
    const qrPath = "./zalo-qr.png";

    return new Promise((resolve) => {
      const zalo = new Zalo();

      void zalo
        .loginQR({ qrPath }, async (event: LoginQRCallbackEvent) => {
          switch (event.type) {
            case LoginQRCallbackEventType.QRCodeGenerated:
              await event.actions.saveToFile(qrPath);
              // Show QR directly in terminal so user can scan without opening file.
              qrcodeTerminal.generate(event.data.code, { small: true });
              onQR(qrPath);
              break;

            case LoginQRCallbackEventType.QRCodeScanned:
              onQR(qrPath, event.data.display_name);
              console.log(
                `\n${c.green}[zalo] QR scanned by ${event.data.display_name}${c.reset}`,
              );
              break;

            case LoginQRCallbackEventType.QRCodeExpired:
              resolve("QR code expired. Try again.");
              break;

            case LoginQRCallbackEventType.QRCodeDeclined:
              resolve("QR login was declined. Try again.");
              break;

            case LoginQRCallbackEventType.GotLoginInfo: {
              const { cookie, imei, userAgent } = event.data;
              await patchServiceConfig("zalo", {
                cookie: JSON.stringify({ imei, cookie, userAgent }),
              });
              // QR image is no longer needed once login succeeds.
              await fs.unlink(qrPath).catch(() => undefined);
              resolve(
                `Logged in successfully! Credentials saved.\nSay "start zalo bot" to begin listening for messages.`,
              );
              break;
            }
          }
        })
        .catch((err: unknown) => {
          resolve(
            `QR login failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    });
  },
};
