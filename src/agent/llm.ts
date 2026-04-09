import type { LlmConfig } from "../config/index.js";
import type { ToolDefinition } from "./tools.js";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  name?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type LlmResponse = {
  content: string | null;
  toolCalls: ToolCall[];
  fullText: string;
};

export async function callLlm(
  messages: ChatMessage[],
  config: LlmConfig,
  tools?: ToolDefinition[],
  stream = false,
): Promise<LlmResponse> {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: 0.7,
    stream,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
    // Streaming + tools is complex; disable stream when tools present
    body.stream = false;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${text}`);
  }

  // Non-streaming (used when tools present or stream=false)
  if (!body.stream || tools) {
    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: ToolCall[];
        };
      }>;
    };
    const msg = data.choices?.[0]?.message;
    const content = msg?.content ?? null;
    const toolCalls = msg?.tool_calls ?? [];
    return { content, toolCalls, fullText: content ?? "" };
  }

  // Streaming (no tools)
  if (!response.body) {
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    return { content: text, toolCalls: [], fullText: text };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{
            delta?: { content?: string };
            message?: { content?: string };
          }>;
        };
        const token =
          parsed.choices?.[0]?.delta?.content ??
          parsed.choices?.[0]?.message?.content ??
          "";
        if (token) {
          fullText += token;
          process.stdout.write(token);
        }
      } catch {
        // skip malformed SSE chunks
      }
    }
  }

  const text = fullText.trim() || "(No response content)";
  return { content: text, toolCalls: [], fullText: text };
}

// Legacy single-prompt streaming call (kept for backward compatibility)
export async function callLlmStreaming(
  prompt: string,
  config: LlmConfig,
): Promise<string> {
  const result = await callLlm(
    [{ role: "user", content: prompt }],
    config,
    undefined,
    true,
  );
  return result.fullText;
}
