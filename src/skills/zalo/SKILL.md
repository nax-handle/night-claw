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

Only after the user chooses Cookie, guide them through these steps **one at a time**. Wait for their response at each step before proceeding.

**Step 1 — Open Zalo Web**
Tell the user: "Open https://chat.zalo.me/ in your browser and log in. Then open DevTools with F12."
Wait for confirmation.

**Step 2 — Get IMEI**
Tell the user: "In the Console tab, run this and paste the result back to me:"
```
localStorage.getItem('z_uuid') || localStorage.getItem('sh_z_uuid')
```
Wait for the user to paste the IMEI value. Save it mentally as `imei`.

**Step 3 — Get userAgent**
Tell the user: "Now run this in the same Console and paste the result:"
```
navigator.userAgent
```
Wait for the user to paste the userAgent string. Save it mentally as `userAgent`.

**Step 4 — Export cookies**
Tell the user: "Install one of these browser extensions and export all cookies from chat.zalo.me as JSON:
- Cookie-Editor: https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm
- J2TEAM Cookies: https://chromewebstore.google.com/detail/j2team-cookies/okpidcojinmlaakglciglbpcpajaibco
Paste the exported cookie JSON here."
Wait for the user to paste the cookie array. Save it as `cookie`.

**Step 5 — Save and start**
Once you have all three values (`imei`, `userAgent`, `cookie`), assemble them into a single JSON string:
```
{"imei":"<imei>","userAgent":"<userAgent>","cookie":<cookie array>}
```
Call `save_config(service="zalo", key="cookie", value="<that JSON string>")`.
Then call `start_service(service="zalo")`.

Do NOT proceed to step 5 if any of the three values is missing — ask again for the missing one.
