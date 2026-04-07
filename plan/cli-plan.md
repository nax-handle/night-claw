# Nightclaw CLI Plan

## Goal
Build a simple CLI for an AI coding agent experience inspired by OpenClaw-style workflows.

## Phase 1 - Foundation
- [x] Create project package metadata for CLI execution (`package.json`).
- [x] Add executable CLI entrypoint (`bin/nightclaw.js`).
- [x] Support `--help`, single prompt mode, and interactive mode.

## Phase 2 - Real AI Connection
- [ ] Add provider layer (`src/provider/*`) to send prompts to an LLM API.
- [ ] Add environment config support (`.env` + API key validation).
- [ ] Stream model output to terminal in real time.

## Phase 3 - Agent Capabilities
- [ ] Add tool abstraction (shell command, file read, file write).
- [ ] Add action approval flow before destructive actions.
- [ ] Add run logging (prompt, tools used, result).

## Phase 4 - Developer Experience
- [ ] Add tests for CLI argument handling and interactive command parsing.
- [ ] Improve terminal UX (colors, loading state, command history).
- [ ] Add docs for installation and local usage.

## Quick Start (current)
```bash
npm start
npm start -- "build me a web scraper"
```
