import TelegramBot from "node-telegram-bot-api";
import type { AgentSession } from "../../agent/index.js";
import { runTurn } from "../../agent/index.js";
import type { NightclawConfig } from "../../config/index.js";
import { getServiceConfig } from "../../config/index.js";
import { colors as c } from "../../ui/colors.js";

export type TelegramAdapter = {
  name: "telegram";
  start: (session: AgentSession, config: NightclawConfig) => Promise<string>;
  stop: () => Promise<string>;
  sendMessage: (chatId: string, text: string) => Promise<void>;
  isRunning: () => boolean;
};

let bot: TelegramBot | null = null;
let running = false;

export const telegramAdapter: TelegramAdapter = {
  name: "telegram",

  async start(session: AgentSession, config: NightclawConfig): Promise<string> {
    if (running) return "Telegram bot is already running.";

    const token = getServiceConfig(config.services, "telegram")?.botToken;
    if (!token) {
      return "No Telegram bot token configured. Tell me your bot token first.";
    }

    try {
      bot = new TelegramBot(token, { polling: true });
      running = true;

      bot.on("message", (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        if (!text) return;

        const senderName =
          msg.from?.first_name ??
          msg.from?.username ??
          String(chatId);

        console.log(
          `\n${c.cyan}[telegram]${c.reset} ${c.dim}${senderName}:${c.reset} ${text}`,
        );

        // Run through agent asynchronously
        void runTurn(text, session, config).then((reply) => {
          if (reply && bot) {
            void bot.sendMessage(chatId, reply, { parse_mode: "Markdown" }).catch(() => {
              // Fallback: send as plain text if Markdown fails
              void bot?.sendMessage(chatId, reply);
            });
          }
        }).catch((err) => {
          console.error(`${c.red}[telegram error]${c.reset}`, err);
        });
      });

      bot.on("polling_error", (err) => {
        console.error(`${c.red}[telegram polling error]${c.reset}`, err.message);
      });

      // Get bot info to show username
      const me = await bot.getMe();
      return `Telegram bot @${me.username ?? "unknown"} is now running and listening for messages.`;
    } catch (err) {
      running = false;
      bot = null;
      return `Failed to start Telegram bot: ${err instanceof Error ? err.message : String(err)}`;
    }
  },

  async stop(): Promise<string> {
    if (!running || !bot) return "Telegram bot is not running.";
    try {
      await bot.stopPolling();
      bot = null;
      running = false;
      return "Telegram bot stopped.";
    } catch (err) {
      return `Error stopping bot: ${err instanceof Error ? err.message : String(err)}`;
    }
  },

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!bot) throw new Error("Telegram bot is not running.");
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  },

  isRunning(): boolean {
    return running;
  },
};
