function getEnv(): { url: string; key: string; model: string } {
  const missing = ["LLM_API_URL", "LLM_API_KEY", "LLM_MODEL"].filter((k) => !process.env[k]);
  if (missing.length > 0) throw new Error(`Missing ${missing.join(" / ")} environment variables`);
  return {
    url: process.env.LLM_API_URL!,
    key: process.env.LLM_API_KEY!,
    model: process.env.LLM_MODEL!,
  };
}

// core types (OpenAI-compatible), consumed by later tasks
export type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "assistant"; content: string | null; tool_calls: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface LLMResult {
  content: string;        // answer text
  reasoning?: string;     // reasoning_content if present
  toolCalls: ToolCall[];  // empty if none
  finishReason: string;
}

interface LLMBody {
  model: string;
  messages: ChatMessage[];
  tools?: ToolSpec[];
  stream?: boolean;
  max_tokens?: number;
}

function combineSignals(signals: AbortSignal[]): AbortSignal {
  const anyFn = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (typeof anyFn === "function") return anyFn.call(AbortSignal, signals);
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

async function callLLM(body: LLMBody, attempt = 0, timeoutMs?: number, signal?: AbortSignal): Promise<Response> {
  const { url, key } = getEnv();
  const timeoutController = new AbortController();
  const timer = timeoutMs !== undefined ? setTimeout(() => timeoutController.abort(), timeoutMs) : undefined;
  const combined =
    signal && timeoutMs !== undefined
      ? combineSignals([signal, timeoutController.signal])
      : (signal ?? (timeoutMs !== undefined ? timeoutController.signal : undefined));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      ...(combined ? { signal: combined } : {}),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (signal?.aborted || combined?.aborted) throw err;
    if (attempt < 1) return callLLM(body, attempt + 1, timeoutMs, signal); // retry once (spec §8)
    throw err;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function invokeLLM(
  messages: ChatMessage[],
  opts: { tools?: ToolSpec[]; maxTokens?: number; timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<LLMResult> {
  const res = await callLLM(
    {
      model: getEnv().model,
      messages,
      tools: opts.tools,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    },
    0,
    opts.timeoutMs,
    opts.signal
  );
  const data = await res.json();
  const m = data.choices?.[0]?.message;
  if (!m) throw new Error("LLM malformed response");
  return {
    content: m.content ?? "",
    reasoning: m.reasoning_content ?? undefined,
    toolCalls: m.tool_calls ?? [],
    finishReason: data.choices[0].finish_reason,
  };
}

export async function streamLLM(
  messages: ChatMessage[],
  onChunk: (part: { content?: string; reasoning?: string }) => void,
  opts: { tools?: ToolSpec[]; maxTokens?: number; timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<LLMResult> {
  const res = await callLLM(
    {
      model: getEnv().model,
      messages,
      tools: opts.tools,
      stream: true,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    },
    0,
    opts.timeoutMs,
    opts.signal
  );
  const reader = res.body?.getReader();
  if (!reader) return { content: "", reasoning: undefined, toolCalls: [], finishReason: "stop" };
  const decoder = new TextDecoder();
  let buf = "";
  let content = "";
  let reasoning = "";
  let finishReason = "stop";
  const toolCalls: ToolCall[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop()!;
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      let j: {
        choices?: {
          delta?: {
            reasoning_content?: string;
            content?: string;
            tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[];
          };
          finish_reason?: string;
        }[];
      };
      try {
        j = JSON.parse(payload);
      } catch {
        continue; // skip malformed chunk, never kill the run on one bad line
      }
      const d = j.choices?.[0]?.delta ?? {};
      if (d.reasoning_content) {
        reasoning += d.reasoning_content;
        onChunk({ reasoning: d.reasoning_content });
      }
      if (d.content) {
        content += d.content;
        onChunk({ content: d.content });
      }
      if (d.tool_calls) {
        for (const tc of d.tool_calls) {
          const i = tc.index ?? 0;
          toolCalls[i] = toolCalls[i] ?? { id: "", type: "function", function: { name: "", arguments: "" } };
          toolCalls[i].id = tc.id ?? toolCalls[i].id;
          toolCalls[i].function.name += tc.function?.name ?? "";
          toolCalls[i].function.arguments += tc.function?.arguments ?? "";
        }
      }
      if (j.choices?.[0]?.finish_reason) finishReason = j.choices[0].finish_reason;
    }
  }
  return { content, reasoning: reasoning || undefined, toolCalls: toolCalls.filter(Boolean), finishReason };
}

export async function runWithTools(params: {
  messages: ChatMessage[];
  tools: ToolSpec[];
  execute: (call: ToolCall) => Promise<string>; // tool result as string
  maxIterations: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onEvent?: (e: {
    type: "reasoning" | "tool_call" | "tool_result" | "content";
    text?: string;
    tool?: string;
    args?: string;
    result?: string;
  }) => void;
}): Promise<string> {
  const msgs = [...params.messages];
  for (let iter = 0; iter < params.maxIterations; iter++) {
    const res = await streamLLM(
      msgs,
      (p) => {
        if (p.reasoning) params.onEvent?.({ type: "reasoning", text: p.reasoning });
        if (p.content) params.onEvent?.({ type: "content", text: p.content });
      },
      { tools: params.tools, maxTokens: params.maxTokens, timeoutMs: params.timeoutMs, signal: params.signal }
    );
    if (res.toolCalls.length === 0) return res.content;
    msgs.push({ role: "assistant", content: res.content, tool_calls: res.toolCalls });
    for (const call of res.toolCalls) {
      params.onEvent?.({ type: "tool_call", tool: call.function.name, args: call.function.arguments });
      const result = await params.execute(call);
      params.onEvent?.({ type: "tool_result", tool: call.function.name, result: result.slice(0, 200) });
      msgs.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }
  // cap reached: final call without tools, force the report
  const final = await streamLLM(msgs, (p) => {
    if (p.reasoning) params.onEvent?.({ type: "reasoning", text: p.reasoning });
    if (p.content) params.onEvent?.({ type: "content", text: p.content });
  }, { maxTokens: params.maxTokens, timeoutMs: params.timeoutMs, signal: params.signal });
  return final.content;
}
