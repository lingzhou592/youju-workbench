import type { ApiError } from "@/lib/domain/types";

export type LLMConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  baseHost: string;
  source: "live" | "mock";
};

export type LLMConfigResult =
  | { ok: true; config: LLMConfig }
  | { ok: false; error: ApiError };

const DEFAULT_BASE_URL = "https://api.deepseek.com/v1";
const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_TIMEOUT = 60_000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function hostOf(value: string): string {
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

export function readLLMConfig(): LLMConfigResult {
  const baseUrl = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  const apiKey = (process.env.LLM_API_KEY || "").trim();
  const model = (process.env.LLM_MODEL || DEFAULT_MODEL).trim();
  const parsedTimeout = Number.parseInt(process.env.LLM_TIMEOUT_MS || "", 10);
  const timeoutMs = clamp(
    Number.isFinite(parsedTimeout) ? parsedTimeout : DEFAULT_TIMEOUT,
    5_000,
    180_000,
  );

  if (!apiKey) {
    return {
      ok: false,
      error: {
        code: "MISSING_API_KEY",
        message: "模型密钥尚未配置，无法进行实时生成。",
        hint: "在项目根目录创建 .env.local，填写 LLM_API_KEY、LLM_BASE_URL 和 LLM_MODEL，然后重启 npm run dev。也可以先加载内置示例运行，预览工作台流程。",
        retryable: false,
      },
    };
  }

  return {
    ok: true,
    config: {
      baseUrl,
      apiKey,
      model,
      timeoutMs,
      baseHost: hostOf(baseUrl),
      source: /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/i.test(baseUrl) ? "mock" : "live",
    },
  };
}

export function healthSnapshot() {
  const baseUrl = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  const configured = Boolean((process.env.LLM_API_KEY || "").trim());
  const parsedTimeout = Number.parseInt(process.env.LLM_TIMEOUT_MS || "", 10);
  return {
    configured,
    model: (process.env.LLM_MODEL || DEFAULT_MODEL).trim() || null,
    baseHost: hostOf(baseUrl) || null,
    timeoutMs: clamp(
      Number.isFinite(parsedTimeout) ? parsedTimeout : DEFAULT_TIMEOUT,
      5_000,
      180_000,
    ),
    message: configured
      ? "模型已配置。密钥只保存在服务端。"
      : "未检测到 LLM_API_KEY。可以在 .env.local 中配置，或先加载内置示例运行。",
  };
}
