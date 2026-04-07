# Tool System Design

## Goal
Give agents the ability to take actions (run commands, read/write files, fetch URLs)
through a typed tool interface with approval gates for dangerous operations.

## Architecture

```
src/
  tools/
    types.ts          # Tool interface + ToolResult type
    registry.ts       # ToolRegistry — register, lookup, list
    runner.ts         # execute tool call, handle approval, return result
    built-in/
      shell.ts        # run shell commands
      file-read.ts    # read file contents
      file-write.ts   # write/create/append files
      web-fetch.ts    # HTTP GET a URL, return text
```

## Tool Interface

```ts
type ToolParameter = {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  required: boolean;
};

type ToolDefinition = {
  name: string;
  description: string;
  parameters: ToolParameter[];
  dangerous: boolean;       // requires user approval before execution
};

type ToolResult = {
  success: boolean;
  output: string;
  error?: string;
};

type Tool = {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
};
```

## Built-in Tools

### shell
```
name: "shell"
description: "Run a shell command and return stdout/stderr"
parameters: [{ name: "command", type: "string", required: true }]
dangerous: true
```

### file_read
```
name: "file_read"
description: "Read file contents from a path"
parameters: [{ name: "path", type: "string", required: true }]
dangerous: false
```

### file_write
```
name: "file_write"
description: "Write content to a file path"
parameters: [
  { name: "path", type: "string", required: true },
  { name: "content", type: "string", required: true }
]
dangerous: true
```

### web_fetch
```
name: "web_fetch"
description: "Fetch a URL and return the response body as text"
parameters: [{ name: "url", type: "string", required: true }]
dangerous: false
```

## Approval Flow

When a tool has `dangerous: true`:

```
Agent wants to run: shell("rm -rf node_modules")

  [nightclaw] Agent wants to execute:
    tool:    shell
    command: rm -rf node_modules

  Allow? [y/n/always]:
```

- `y` → execute once
- `n` → skip, return "User denied" to agent
- `always` → auto-approve this tool for rest of session

## Tool Call Format (LLM ↔ Agent)

Uses OpenAI function-calling format:

```json
{
  "tool_calls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "shell",
        "arguments": "{\"command\": \"ls -la\"}"
      }
    }
  ]
}
```

Agent sends tool definitions as `tools` array in the chat completions request.
LLM returns `tool_calls`, agent executes, injects result as `tool` role message.

## Tool Loop

```
User prompt
  → Agent sends to LLM (with tools)
    → LLM returns tool_call
      → Agent executes tool (with approval if dangerous)
        → Agent sends tool result back to LLM
          → LLM returns final answer (or another tool_call)
            → repeat until LLM returns content without tool_calls
```

## Implementation Steps

1. [ ] Define `Tool`, `ToolDefinition`, `ToolResult` types in `src/tools/types.ts`
2. [ ] Build `ToolRegistry` in `src/tools/registry.ts`
3. [ ] Implement `shell` tool in `src/tools/built-in/shell.ts`
4. [ ] Implement `file_read` tool
5. [ ] Implement `file_write` tool
6. [ ] Implement `web_fetch` tool
7. [ ] Build tool runner with approval prompt in `src/tools/runner.ts`
8. [ ] Update `src/agent/llm.ts` to include tools in request + handle tool_calls loop
9. [ ] Add `nightclaw tools` command to list available tools
