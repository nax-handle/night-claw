# Multi-Agent Architecture

## Goal
Support multiple named agents, each with its own system prompt, LLM provider,
model, and tool set. Agents can delegate sub-tasks to other agents.

## Config Format

```jsonc
// nightclaw.config.json
{
  "providers": { ... },

  "agents": {
    "coder": {
      "description": "Writes and edits code",
      "provider": "openai",
      "model": "gpt-4.1",
      "systemPrompt": "You are a senior software engineer...",
      "tools": ["shell", "file_read", "file_write"],
      "temperature": 0.2
    },
    "planner": {
      "description": "Breaks tasks into steps",
      "provider": "anthropic",
      "model": "claude-sonnet-4-20250514",
      "systemPrompt": "You are a project planner...",
      "tools": ["file_read"],
      "temperature": 0.7
    },
    "reviewer": {
      "description": "Reviews code for bugs and style",
      "provider": "openai",
      "model": "gpt-4.1-mini",
      "systemPrompt": "You are a code reviewer...",
      "tools": ["file_read"],
      "temperature": 0.3
    }
  },

  "defaultAgent": "coder"
}
```

## File Structure

```
src/
  agent/
    types.ts            # AgentDefinition, AgentSession types
    registry.ts         # AgentRegistry — load agents from config
    runner.ts           # AgentRunner — run prompt through agent loop
    session.ts          # AgentSession — conversation memory per run
    delegation.ts       # agent-to-agent hand-off logic
    index.ts            # public API: createAgent, runAgent
    llm.ts              # (existing) LLM streaming call
```

## Agent Lifecycle

```
1. CLI receives: nightclaw run coder "add auth to the app"

2. AgentRegistry.resolve("coder")
   → returns AgentDefinition { provider, model, systemPrompt, tools }

3. AgentRunner.run(agent, prompt)
   → creates AgentSession (empty message history)
   → injects system prompt as first message
   → sends to LLM with tools attached
   → enters tool loop (see tools.md)
   → streams final response to terminal

4. Session is kept alive for interactive follow-ups
```

## Agent Types

### Direct Agent
Standard single-turn or multi-turn agent. Receives a prompt, calls LLM,
optionally uses tools, returns a response.

### Orchestrator Agent
A meta-agent that breaks a task into sub-tasks and delegates each to
specialized agents.

```
User: "Build a todo app with tests"

Orchestrator:
  1. delegate to "planner": "Break down a todo app into implementation steps"
  2. delegate to "coder": "Implement step 1: create data model..."
  3. delegate to "coder": "Implement step 2: add API routes..."
  4. delegate to "reviewer": "Review the code in src/"
  5. summarize results to user
```

### Pipeline Agent
Agents chained in sequence. Output of one becomes input to the next.

```jsonc
{
  "agents": {
    "code-and-review": {
      "type": "pipeline",
      "steps": ["coder", "reviewer"]
    }
  }
}
```

## Delegation Protocol

When an orchestrator agent wants to delegate:

```ts
type DelegationRequest = {
  targetAgent: string;     // agent name from registry
  prompt: string;          // task to delegate
  context?: string;        // optional shared context
};

type DelegationResult = {
  agent: string;
  response: string;
  toolsUsed: string[];
  tokenCount: number;
};
```

The orchestrator LLM uses a special `delegate` tool:

```json
{
  "name": "delegate",
  "description": "Delegate a sub-task to another agent",
  "parameters": [
    { "name": "agent", "type": "string", "required": true },
    { "name": "task", "type": "string", "required": true }
  ]
}
```

## Session / Memory

Each agent run creates an `AgentSession`:

```ts
type AgentSession = {
  id: string;
  agent: string;
  messages: ChatMessage[];
  toolCalls: ToolCallRecord[];
  startedAt: Date;
  tokenCount: { input: number; output: number };
};
```

- In interactive mode, session persists across prompts (multi-turn)
- In single-prompt mode, session is one-shot
- Future: persist sessions to `~/.nightclaw/sessions/` for replay

## CLI Commands

```bash
nightclaw "prompt"                    # uses defaultAgent
nightclaw run coder "prompt"          # target specific agent
nightclaw run planner "prompt"        # use planner agent
nightclaw agents                      # list all configured agents
nightclaw agents show coder           # show agent details
```

## Implementation Steps

1. [ ] Define `AgentDefinition` type in `src/agent/types.ts`
2. [ ] Build `AgentRegistry` to load agents from config
3. [ ] Build `AgentSession` for conversation memory
4. [ ] Build `AgentRunner` with tool loop integration
5. [ ] Add `delegate` tool for orchestrator agents
6. [ ] Add pipeline agent type
7. [ ] Add `nightclaw run <agent> "prompt"` CLI command
8. [ ] Add `nightclaw agents` CLI command
9. [ ] Add session persistence (optional, future)
