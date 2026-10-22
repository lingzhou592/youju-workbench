import type { ApiError, ModelUsage } from "@/lib/domain/types";
import type { LLMConfig } from "./config";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatResult = {
  content: string;
  model: string;
  provider: string;
  latencyMs: number;
  usage?: ModelUsage;
  source: "live" | "mock";
};

export type ChatOutcome =
  | { ok: true; data: ChatResult }
  | { ok: false; error: ApiError };

function endpointOf(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/chat/completions")
    ? trimmed
    : `${trimmed}/chat/completions`;
}

function contentToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const record = part as Record<string, unknown>;
          if (typeof record.text === "string") return record.text;
          if (typeof record.content === "string") return record.content;
        }
        return "";
      })
      .filter(Boolean)
      .join("");
  }
  return "";
}

function mapHttpError(status: number, body: string): ApiError {
  const snippet = body.length > 400 ? `${body.slice(0, 400)}…` : body;
  if (status === 401 || status === 403) {
    return {
      code: "LLM_UNAUTHORIZED",
      message: "模型服务拒绝了这次请求，密钥可能无效或没有权限。",
      hint: "检查 .env.local 中的 LLM_API_KEY 与 LLM_BASE_URL 是否匹配，并确认该密钥可用。",
      retryable: false,
      raw: snippet,
    };
  }
  if (status === 429) {
    return {
      code: "LLM_RATE_LIMITED",
      message: "模型服务返回了限流或额度不足。",
      hint: "稍后重试，或检查账户额度与并发限制。",
      retryable: true,
      raw: snippet,
    };
  }
  if (status >= 500) {
    return {
      code: "LLM_UPSTREAM_ERROR",
      message: "模型服务暂时不可用。",
      hint: "这是上游服务的错误，可以稍后重试。",
      retryable: true,
      raw: snippet,
    };
  }
  return {
    code: "LLM_UPSTREAM_ERROR",
    message: `模型服务返回了 ${status} 状态码。`,
    hint: "检查 LLM_BASE_URL、模型名和服务商配置。",
    retryable: true,
    raw: snippet,
  };
}

export async function chatCompletion(options: {
  config: LLMConfig;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
}): Promise<ChatOutcome> {
  const { config, messages, temperature, maxTokens } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(endpointOf(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const latencyMs = Date.now() - startedAt;
    const rawText = await response.text();

    if (!response.ok) {
      return { ok: false, error: mapHttpError(response.status, rawText) };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawText);
    } catch {
      return {
        ok: false,
        error: {
          code: "LLM_UPSTREAM_ERROR",
          message: "模型服务返回的不是 JSON。",
          hint: "检查 LLM_BASE_URL 是否指向 OpenAI-compatible 的 /v1 接口。",
          retryable: true,
          raw: rawText.slice(0, 400),
        },
      };
    }

    const record =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const choices = Array.isArray(record.choices) ? record.choices : [];
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    const content =
      contentToText(message?.content) || contentToText(first?.text);

    if (!content.trim()) {
      return {
        ok: false,
        error: {
          code: "LLM_FORMAT_ERROR",
          message: "模型返回了空内容。",
          hint: "可以重试一次；如果持续出现，检查模型名是否支持 Chat Completions。",
          retryable: true,
          raw: rawText.slice(0, 400),
        },
      };
    }

    const usageRaw = record.usage as Record<string, unknown> | undefined;
    const usage =
      usageRaw && typeof usageRaw === "object"
        ? {
            promptTokens:
              typeof usageRaw.prompt_tokens === "number"
                ? usageRaw.prompt_tokens
                : undefined,
            completionTokens:
              typeof usageRaw.completion_tokens === "number"
                ? usageRaw.completion_tokens
                : undefined,
            totalTokens:
              typeof usageRaw.total_tokens === "number"
                ? usageRaw.total_tokens
                : undefined,
          }
        : undefined;

    return {
      ok: true,
      data: {
        content,
        model:
          typeof record.model === "string" ? record.model : config.model,
        provider: config.baseHost,
        latencyMs,
        usage,
        source: config.source,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: {
          code: "LLM_TIMEOUT",
          message: `模型请求超过 ${Math.round(config.timeoutMs / 1000)} 秒仍未返回。`,
          hint: "可以重试，或在 .env.local 中调大 LLM_TIMEOUT_MS。",
          retryable: true,
        },
      };
    }
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: "无法连接到模型服务。",
        hint: "检查网络、LLM_BASE_URL，以及本地服务是否已启动。",
        retryable: true,
        raw: error instanceof Error ? error.message : undefined,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
