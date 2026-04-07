# Agent System — Planning Docs

This folder contains design documents for the Nightclaw multi-agent system.

## Documents

| File | Description |
|---|---|
| `multi-llm.md` | Multi-provider LLM config (OpenAI, Anthropic, Ollama, etc.) |
| `multi-agent.md` | Multi-agent architecture, registry, delegation |
| `tools.md` | Tool system: interface, built-in tools, approval flow |
| `config-schema.md` | Full `nightclaw.config.json` schema reference |

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                  CLI Layer                   │
│  (nightclaw "prompt" / interactive REPL)     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              Agent Router                    │
│  resolve agent by name → load system prompt  │
│  attach tools → bind LLM provider            │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   ┌─────────┐ ┌────────┐ ┌────────┐
   │ Agent A │ │Agent B │ │Agent C │
   │ (coder) │ │(planner)│ │(reviewer)│
   └────┬────┘ └───┬────┘ └───┬────┘
        │          │          │
        ▼          ▼          ▼
   ┌─────────────────────────────────┐
   │         LLM Provider Pool       │
   │  openai / anthropic / ollama    │
   └──────────────┬──────────────────┘
                  │
   ┌──────────────▼──────────────────┐
   │          Tool Registry          │
   │  shell · file_read · file_write │
   │  web_fetch · custom plugins     │
   └─────────────────────────────────┘
```
