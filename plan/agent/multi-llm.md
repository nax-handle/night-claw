# Multi-LLM Provider Design

## Goal
Support multiple LLM providers in a single config so different agents can use
different models (e.g. GPT-4.1 for coding, Claude for planning, Ollama for local).

## Config Format

```jsonc
// nightclaw.config.json
{
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
  "defaultModel": "gpt-4.1-mini"
}
```

## Provider Interface

Each provider shares the same OpenAI-compatible `/chat/completions` contract.
Non-OpenAI providers that are compatible (Ollama, OpenRouter, Together, etc.)
work out of the box. Anthropic needs an adapter.

```
src/
  providers/
    index.ts              # ProviderPool — resolve provider by name
    types.ts              # LlmProvider interface
    openai-compatible.ts  # generic OpenAI-compat caller (covers most)
    anthropic.ts          # Anthropic Messages API adapter
```

### TypeScript Interface

```ts
type LlmProvider = {
  name: string;
  apiKey: string;
  baseUrl: string;
};

type LlmRequest = {
  provider: string;       // key into providers map
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  stream?: boolean;
};

type ProviderPool = {
  resolve(name: string): LlmProvider;
  call(request: LlmRequest): AsyncIterable<string>;
};
```

## Resolution Order

1. Agent definition says `provider: "anthropic"`, `model: "claude-sonnet-4-20250514"`
2. `ProviderPool.resolve("anthropic")` → returns `{ apiKey, baseUrl }`
3. `ProviderPool.call(...)` → picks correct adapter, streams tokens

## Fallback Chain

```jsonc
{
  "agents": {
    "coder": {
      "provider": "openai",
      "model": "gpt-4.1",
      "fallback": {
        "provider": "ollama",
        "model": "llama3"
      }
    }
  }
}
```

If primary provider returns 429/500/timeout, retry with fallback provider.

## Migration Path from Current Config

Current single-provider config:

```json
{ "apiKey": "sk-...", "model": "gpt-4.1-mini", "baseUrl": "https://api.openai.com/v1" }
```

New multi-provider config is **backwards compatible**. If `providers` key is
missing, treat the root object as a single OpenAI-compatible provider.

## Implementation Steps

1. [ ] Add `LlmProvider` type to `src/providers/types.ts`
2. [ ] Create `ProviderPool` class in `src/providers/index.ts`
3. [ ] Add `OpenAICompatibleProvider` in `src/providers/openai-compatible.ts`
4. [ ] Add `AnthropicProvider` adapter in `src/providers/anthropic.ts`
5. [ ] Update config parser to handle both old and new format
6. [ ] Update `src/agent/llm.ts` to use `ProviderPool` instead of raw fetch
7. [ ] Add `nightclaw providers` command to list configured providers
8. [ ] Add fallback chain logic
