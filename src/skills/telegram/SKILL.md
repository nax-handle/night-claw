---
name: telegram
description: Telegram Bot interface. Listens for messages and sends replies via the Telegram Bot API.
homepage: https://core.telegram.org/bots/api
metadata:
  {
    "nightclaw":
      {
        "emoji": "✈️",
        "type": "interface",
        "requires": {},
        "setup":
          [
            "Get a bot token from @BotFather on Telegram",
            "Send /newbot to @BotFather",
            "Copy the token and give it to nightclaw",
          ],
      },
  }
---

# Telegram Bot

Nightclaw can act as a Telegram bot -- receiving messages from users and replying using the AI agent.

## Setup

When the user asks to set up or start the Telegram bot:
1. Ask them to open Telegram, search for @BotFather, send `/newbot`, and copy the token
2. When they paste the token, call `save_config(service="telegram", key="botToken", value="<token>")`
3. Then immediately call `start_service(service="telegram")` to start the bot

## How it works

- Uses long-polling (no webhook server needed)
- Every message sent to the bot is passed through the nightclaw agent
- The agent's reply is sent back to the sender
- Supports both private messages and group chats

## Capabilities

- Receive and reply to text messages
- Send formatted messages (Markdown)
- Works in private chats and group chats
- Remembers the user's Telegram chat ID for proactive notifications

## Notes

- The bot only responds to messages while `nightclaw serve` is running
- Long-polling checks for new messages every few seconds
- To send a proactive message to yourself, note your chat ID after the first interaction
