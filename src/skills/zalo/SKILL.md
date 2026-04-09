---
name: zalo
description: Zalo personal account bot via zca-js. Listen and reply to Zalo messages using your personal account.
homepage: https://zca-js.tdung.com/vi/get-started/introduction
metadata:
  {
    "nightclaw":
      {
        "emoji": "💬",
        "type": "interface",
        "requires": {},
        "setup":
          [
            "Login with Zalo cookie (exported from browser) or scan a QR code",
            "Tell nightclaw: 'setup zalo bot' to start",
          ],
      },
  }
---

# Zalo Bot (via zca-js)

> ⚠️ **Warning:** zca-js is an unofficial library. Using it may violate Zalo's terms of service and could result in account suspension. Use at your own risk.

Nightclaw can act as a Zalo bot using your personal Zalo account through [zca-js](https://zca-js.tdung.com/vi/get-started/introduction).

## Setup

When the user asks to set up or log in to Zalo, **always ask them to choose a login method first**. Do NOT call any tool until they pick one.

Ask: "How do you want to log in to Zalo? (1) QR code — scan with your phone, or (2) Cookie — paste exported browser cookies"

### Option 1: QR Code Login

Only after the user chooses QR: call `start_service(service="zalo")`. The bot will display a QR code in the terminal. Tell the user to:
- Open Zalo → tap their avatar → QR Login → scan the QR

### Option 2: Cookie Login

Only after the user chooses Cookie: ask them to export Zalo cookies from their browser (after logging in at zalo.me):
- Use a browser extension like "Cookie Editor" to export as JSON
- When they paste the JSON, call `save_config(service="zalo", key="cookie", value="<the JSON>")`, then call `start_service(service="zalo")`

## How it works

- Uses zca-js to connect to Zalo using your personal account
- Listens for incoming messages (private chats and group chats)
- Passes each message through the nightclaw agent
- Sends the agent's reply back to the sender

## Available API features

- `sendMessage(text, threadId)` -- Send text message
- `getAllGroups()` -- List all group chats
- `getGroupInfo(groupId)` -- Get group details and members
- `getUserInfo(userId)` -- Get user profile
- `findUser(query)` -- Search for a user
- `addUserToGroup(userId, groupId)` -- Add user to group
- `sendSticker(stickerId, threadId)` -- Send a sticker
- `uploadAttachment(filePath, threadId)` -- Send a file

## Listener events

- `message` -- New message received (private or group)
- `reaction` -- Someone reacted to a message
- `group_event` -- Group join/leave/rename events
- `undo` -- Message was unsent

## Notes

- Replies in Vietnamese by default when chatting on Zalo (configurable in your notes)
- The bot stays connected while `nightclaw serve` is running
- Cookie may expire; use QR re-login if disconnected
