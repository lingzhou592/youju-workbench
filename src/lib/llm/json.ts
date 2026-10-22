export type JsonExtraction =
  | { ok: true; value: unknown; cleaned: string }
  | { ok: false; raw: string; message: string };

function stripFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

export function extractJson(raw: string): JsonExtraction {
  const cleaned = stripFence(raw);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    return {
      ok: false,
      raw,
      message: "模型返回中没有找到完整的 JSON 对象。",
    };
  }

  const candidate = cleaned.slice(start, end + 1);
  try {
    return { ok: true, value: JSON.parse(candidate), cleaned: candidate };
  } catch (error) {
    return {
      ok: false,
      raw,
      message:
        error instanceof Error
          ? `JSON 解析失败：${error.message}`
          : "JSON 解析失败。",
    };
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function clip(value: string, max = 600): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
