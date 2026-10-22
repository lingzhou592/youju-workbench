import { NextResponse } from "next/server";
import type { ApiError, ApiErrorCode } from "@/lib/domain/types";
import { isRecord } from "@/lib/llm/json";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export function jsonOk<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: true, data, ...(meta ? { meta } : {}) },
    { headers: NO_STORE_HEADERS },
  );
}

export function jsonError(error: ApiError, status?: number) {
  return NextResponse.json(
    { ok: false, error },
    { status: status ?? statusForCode(error.code), headers: NO_STORE_HEADERS },
  );
}

export function statusForCode(code: ApiErrorCode): number {
  switch (code) {
    case "BAD_REQUEST":
      return 400;
    case "MISSING_API_KEY":
      return 503;
    case "LLM_UNAUTHORIZED":
      return 502;
    case "LLM_RATE_LIMITED":
      return 429;
    case "LLM_TIMEOUT":
      return 504;
    case "LLM_FORMAT_ERROR":
    case "LLM_SCHEMA_ERROR":
      return 502;
    case "LLM_UPSTREAM_ERROR":
      return 502;
    case "NETWORK_ERROR":
      return 502;
    default:
      return 500;
  }
}

export class RequestValidationError extends Error {
  hint?: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "RequestValidationError";
    this.hint = hint;
  }
}

export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 120_000) {
    throw new RequestValidationError(
      "请求体过大，请减少事实卡数量或文本长度。",
    );
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    throw new RequestValidationError("无法读取请求体。");
  }

  if (text.length > 120_000) {
    throw new RequestValidationError(
      "请求体过大，请减少事实卡数量或文本长度。",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new RequestValidationError("请求体不是合法 JSON。");
  }

  if (!isRecord(parsed)) {
    throw new RequestValidationError("请求体必须是一个 JSON 对象。");
  }
  return parsed;
}

export function jsonFromUnknownError(error: unknown) {
  if (error instanceof RequestValidationError) {
    return jsonError({
      code: "BAD_REQUEST",
      message: error.message,
      hint: error.hint,
      retryable: false,
    });
  }
  console.error("[api] unexpected error", error);
  return jsonError({
    code: "UNKNOWN",
    message: "服务端出现未预期的错误。",
    hint: "可以重试；如果持续出现，请查看本地终端日志。",
    retryable: true,
  });
}
