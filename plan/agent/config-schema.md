# Config Schema Reference

## File Locations (load priority)

| Priority | Path | Description |
|---|---|---|
| 1 | `./nightclaw.config.json` | Project-local config (checked first) |
| 2 | `~/.nightclaw/config.json` | Global user config (fallback) |

## Minimal Config (current — backwards compatible)

```json
{
  "apiKey": "sk-...",
  "model": "gpt-4.1-mini",
  "baseUrl": "https://api.openai.com/v1"
}
```

If the config has no `providers` key, the CLI treats the root as a single
OpenAI-compatible provider. This is the **v1** format and will always work.

## Full Config (v2 — multi-provider, multi-agent)

```jsonc
{
  // ── Providers ──────────────────────────────────────
  "providers": {
    "openai": {
      "apiKey": "sk-...",
      "baseUrl": "https://api.openai.com/v1"
    },
    "anthropic": {
      "apiKey": "sk-ant-...",
      "baseUrl": "https://api.anthropic.com"
    },
    "ollama": {
      "apiKey": "",
      "baseUrl": "http://localhost:11434/v1"
    },
    "openrouter": {
      "apiKey": "sk-or-...",
      "baseUrl": "https://openrouter.ai/api/v1"
    }
  },

  "defaultProvider": "openai",
  "defaultModel": "gpt-4.1-mini",

  // ── Agents ─────────────────────────────────────────
  "agents": {
    "coder": {
      "description": "Writes and edits code",
      "provider": "openai",
      "model": "gpt-4.1",
      "systemPrompt": "You are a senior software engineer. Write clean, minimal code.",
      "tools": ["shell", "file_read", "file_write"],
      "temperature": 0.2
    },
    "planner": {
      "description": "Breaks tasks into steps",
      "provider": "anthropic",
      "model": "claude-sonnet-4-20250514",
      "systemPrompt": "You are a project planner. Output numbered step lists.",
      "tools": ["file_read"],
      "temperature": 0.7
    },
    "reviewer": {
      "description": "Reviews code for bugs and style",
      "provider": "openai",
      "model": "gpt-4.1-mini",
      "systemPrompt": "You are a code reviewer. Be concise and specific.",
      "tools": ["file_read"],
      "temperature": 0.3
    },
    "local": {
      "description": "Fast local model for quick tasks",
      "provider": "ollama",
      "model": "llama3",
      "systemPrompt": "You are a helpful assistant.",
      "tools": [],
      "temperature": 0.5
    }
  },

  "defaultAgent": "coder",

  // ── Tools ──────────────────────────────────────────
  "tools": {
    "shell": {
      "enabled": true,
      "requireApproval": true
    },
    "file_read": {
      "enabled": true,
      "requireApproval": false
    },
    "file_write": {
      "enabled": true,
      "requireApproval": true
    },
    "web_fetch": {
      "enabled": true,
      "requireApproval": false
    }
  },

  // ── Session ────────────────────────────────────────
  "session": {
    "persist": false,
    "maxHistory": 50,
    "storePath": "~/.nightclaw/sessions/"
  }
}
```

## Type Definitions

```ts
type ProviderConfig = {
  apiKey: string;
  baseUrl: string;
};

type AgentConfig = {
  description: string;
  provider: string;          // key into providers map
  model: string;
  systemPrompt: string;
  tools: string[];           // tool names from tools map
  temperature?: number;      // 0.0 – 2.0, default 0.7
  fallback?: {
    provider: string;
    model: string;
  };
};

type ToolConfig = {
  enabled: boolean;
  requireApproval: boolean;
};

type SessionConfig = {
  persist: boolean;
  maxHistory: number;
  storePath: string;
};

type NightclawFullConfig = {
  // v1 compat (flat)
  apiKey?: string;
  model?: string;
  baseUrl?: string;

  // v2 multi
  providers?: Record<string, ProviderConfig>;
  defaultProvider?: string;
  defaultModel?: string;
  agents?: Record<string, AgentConfig>;
  defaultAgent?: string;
  tools?: Record<string, ToolConfig>;
  session?: SessionConfig;
};
```

## Validation Rules

- If `providers` exists, at least one provider must have a non-empty `apiKey`
- If `agents` exists, each agent's `provider` must reference a key in `providers`
- If `agents` exists, each agent's `tools` entries must be known tool names
- `defaultProvider` must reference a key in `providers`
- `defaultAgent` must reference a key in `agents`
- `temperature` must be between 0.0 and 2.0

## CLI Commands That Use Config

| Command | Config fields used |
|---|---|
| `nightclaw "prompt"` | defaultAgent → agent → provider → model |
| `nightclaw run coder "prompt"` | agents.coder → provider → model |
| `nightclaw setup` | writes v1 flat config |
| `nightclaw init-config` | writes v2 template |
| `nightclaw agents` | lists agents map |
| `nightclaw providers` | lists providers map |
