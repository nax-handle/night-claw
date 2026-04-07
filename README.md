# nightclaw

Simple AI agent style CLI.

## Quick Start

Install dependencies and build:

```bash
npm install
npm run build
npm link
```

Then launch:

```bash
nightclaw
```

Inside interactive mode:

```text
/help
/setup
/setup llm
```

Type any normal text to chat with the model, and `exit` to quit.

## Configuration

Project config is stored in:

```text
nightclaw.config.json
```

Current shape:

```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "your-api-key",
    "model": "gpt-4.1-mini",
    "baseUrl": "https://api.openai.com/v1"
  }
}
```

`nightclaw.config.json` is ignored by git.

## Other Commands

Single prompt mode:

```bash
nightclaw "build login api"
```

Help:

```bash
nightclaw --help
```

Typo alias:

```bash
nigthclaw --help
```

Planning notes live in `plan/cli-plan.md`.
