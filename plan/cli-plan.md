# Nightclaw CLI Plan

## Goal
Build a multi-agent AI CLI inspired by OpenClaw-style workflows.

## Phase 1 - Foundation
- [x] Create project package metadata (`package.json`)
- [x] Add executable CLI entrypoint (`bin/nightclaw.js`)
- [x] Support `--help`, single prompt mode, interactive REPL
- [x] TypeScript build pipeline (`tsc` + `tsx` dev mode)
- [x] Block-art mascot with ANSI colors

## Phase 2 - Config + LLM Connection
- [x] JSON config file (`nightclaw.config.json` + `~/.nightclaw/config.json`)
- [x] Setup wizard (`nightclaw setup`)
- [x] Init config template (`nightclaw init-config`)
- [x] OpenAI-compatible `/chat/completions` call
- [x] SSE streaming output to terminal
- [ ] Multi-provider config (see `plan/agent/multi-llm.md`)

## Phase 3 - Multi-Agent System
- [ ] Agent registry + named agent definitions (see `plan/agent/multi-agent.md`)
- [ ] Per-agent LLM binding (agent → provider → model)
- [ ] System prompt per agent
- [ ] Agent-to-agent delegation (hand-off / sub-task)
- [ ] Conversation memory per agent session

## Phase 4 - Tool System
- [ ] Tool interface + registry (see `plan/agent/tools.md`)
- [ ] Built-in tools: shell, file_read, file_write, web_fetch
- [ ] Action approval flow before destructive operations
- [ ] Tool result injection back into agent context

## Phase 5 - Developer Experience
- [ ] Tests for CLI, config, agent, tools
- [ ] Terminal UX (spinner, colors, markdown rendering)
- [ ] Run logging (prompt, tools used, tokens, duration)
- [ ] `nightclaw agents` command to list configured agents
- [ ] `nightclaw run <agent> "prompt"` to target a specific agent

## Quick Start
```bash
nightclaw setup
nightclaw "build me a web scraper"
```
