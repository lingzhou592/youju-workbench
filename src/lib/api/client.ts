import type {
  ApiEnvelope,
  HealthResponse,
} from "@/lib/domain/types";

export async function postJson<T>(
  url: string,
  body: unknown,
): Promise<ApiEnvelope<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload: unknown = await response.json().catch(() => null);
    if (payload && typeof payload === "object" && "ok" in payload) {
      return payload as ApiEnvelope<T>;
    }

    return {
      ok: false,
      error: {
        code: "UNKNOWN",
        message: `接口返回了无法识别的响应（HTTP ${response.status}）。`,
        retryable: true,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: "无法连接到本地接口。",
        hint: "确认 npm run dev 仍在运行，然后重试。",
        retryable: true,
        raw: error instanceof Error ? error.message : undefined,
      },
    };
  }
}

export async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}
