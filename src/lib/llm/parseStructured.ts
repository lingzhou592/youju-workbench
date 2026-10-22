import type {
  ApiError,
  Citation,
  FactCard,
  GenerationResult,
  ModelIssue,
  ModelMeta,
  ReviseResponse,
  ReviewResponse,
  TitleCandidate,
} from "@/lib/domain/types";
import { normalizeText } from "@/lib/retrieval/tokenize";
import { asString, asStringArray, clip, extractJson, isRecord } from "./json";

export type ParseOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

function formatError(message: string, raw: string): ApiError {
  return {
    code: "LLM_FORMAT_ERROR",
    message,
    hint: "可以重试一次；如果持续出现，检查模型是否支持稳定的 JSON 输出。",
    retryable: true,
    raw: clip(raw, 800),
  };
}

function schemaError(message: string, raw: string): ApiError {
  return {
    code: "LLM_SCHEMA_ERROR",
    message,
    hint: "模型返回了 JSON，但字段不完整。可以重试，或换一个指令遵循能力更好的模型。",
    retryable: true,
    raw: clip(raw, 800),
  };
}

function parseCitations(value: unknown): Citation[] {
  if (!Array.isArray(value)) return [];
  const result: Citation[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const factId = asString(item.factId).trim();
    if (!/^F-\d{3}$/.test(factId)) continue;
    result.push({
      factId,
      quote: asString(item.quote).trim(),
      usedFor: asString(item.usedFor).trim() || undefined,
    });
  }
  return result;
}

export function parseGenerationOutput(
  raw: string,
  meta: ModelMeta,
): ParseOutcome<GenerationResult> {
  const extracted = extractJson(raw);
  if (!extracted.ok) {
    return { ok: false, error: formatError(extracted.message, raw) };
  }
  if (!isRecord(extracted.value)) {
    return { ok: false, error: schemaError("模型返回的 JSON 不是对象。", raw) };
  }
  const value = extracted.value;

  const titlesRaw = Array.isArray(value.titles) ? value.titles : [];
  if (titlesRaw.length < 2) {
    return {
      ok: false,
      error: schemaError("模型没有返回两个标题候选。", raw),
    };
  }

  const titles = titlesRaw.slice(0, 2).map((item, index): TitleCandidate => {
    const record = isRecord(item) ? item : {};
    return {
      id: index === 0 ? "A" : "B",
      angle:
        asString(record.angle).trim() ||
        (index === 0 ? "场景切入" : "人群需求"),
      title: asString(record.title).trim(),
      rationale: asString(record.rationale).trim(),
      hypothesis: asString(record.hypothesis).trim(),
    };
  });

  if (!titles[0].title || !titles[1].title) {
    return {
      ok: false,
      error: schemaError("标题候选缺少标题文本。", raw),
    };
  }

  const body = asString(value.body).trim();
  if (!body) {
    return { ok: false, error: schemaError("模型没有返回正文。", raw) };
  }
  if (body.length > 8000) {
    return {
      ok: false,
      error: schemaError("模型返回的正文过长，无法安全处理。", raw),
    };
  }

  return {
    ok: true,
    data: {
      titles: [titles[0], titles[1]],
      body,
      tags: asStringArray(value.tags),
      imageSuggestion: asStringArray(value.imageSuggestion),
      citations: parseCitations(value.citations),
      selfCheck: asStringArray(value.selfCheck),
      source: meta.source,
      modelMeta: meta,
    },
  };
}

const ISSUE_CATEGORIES = new Set([
  "事实依据",
  "品牌语气",
  "人群匹配",
  "结构表达",
  "合规风险",
  "其他",
]);
const SEVERITIES = new Set(["error", "warning", "info"]);
const CONFIDENCES = new Set(["high", "medium", "low"]);

export function parseReviewOutput(
  raw: string,
  context: { facts: FactCard[]; copy: string },
): ParseOutcome<ReviewResponse> {
  const extracted = extractJson(raw);
  if (!extracted.ok) {
    return { ok: false, error: formatError(extracted.message, raw) };
  }
  if (!isRecord(extracted.value)) {
    return { ok: false, error: schemaError("模型返回的 JSON 不是对象。", raw) };
  }
  const issuesRaw = extracted.value.issues;
  if (!Array.isArray(issuesRaw)) {
    return {
      ok: false,
      error: schemaError("模型没有返回 issues 数组。", raw),
    };
  }

  const knownFacts = new Set(context.facts.map((fact) => fact.id));
  const normalizedCopy = normalizeText(context.copy);
  const issues: ModelIssue[] = [];

  for (const [index, item] of issuesRaw.slice(0, 12).entries()) {
    if (!isRecord(item)) continue;
    const problem = asString(item.problem).trim();
    if (!problem) continue;

    let quote = asString(item.quote).trim();
    let confidence = asString(item.confidence).trim();
    if (!CONFIDENCES.has(confidence)) confidence = "medium";

    if (quote) {
      const quoteFound = normalizeText(quote).length > 0
        ? normalizedCopy.includes(normalizeText(quote))
        : false;
      if (!quoteFound) {
        quote = "";
        confidence = "low";
      }
    }

    const categoryRaw = asString(item.category).trim();
    const severityRaw = asString(item.severity).trim();
    const evidenceFactIds = asStringArray(item.evidenceFactIds).filter((id) =>
      knownFacts.has(id),
    );

    issues.push({
      id: `issue-${index + 1}`,
      category: ISSUE_CATEGORIES.has(categoryRaw)
        ? (categoryRaw as ModelIssue["category"])
        : "其他",
      severity: SEVERITIES.has(severityRaw)
        ? (severityRaw as ModelIssue["severity"])
        : "warning",
      quote,
      problem: quote
        ? problem
        : `（模型引用的原文未能在文案中逐字定位）${problem}`,
      evidenceFactIds,
      suggestion: asString(item.suggestion).trim(),
      confidence: confidence as ModelIssue["confidence"],
      status: "open",
    });
  }

  return {
    ok: true,
    data: {
      issues,
      summary: asString(extracted.value.summary).trim(),
    },
  };
}

export function parseReviseOutput(
  raw: string,
): ParseOutcome<ReviseResponse> {
  const extracted = extractJson(raw);
  if (!extracted.ok) {
    return { ok: false, error: formatError(extracted.message, raw) };
  }
  if (!isRecord(extracted.value)) {
    return { ok: false, error: schemaError("模型返回的 JSON 不是对象。", raw) };
  }
  const value = extracted.value;
  const title = asString(value.title).trim();
  const body = asString(value.body).trim();

  if (!title || !body) {
    return {
      ok: false,
      error: schemaError("修订结果缺少标题或正文。", raw),
    };
  }
  if (body.length > 8000) {
    return {
      ok: false,
      error: schemaError("修订后的正文过长，无法安全处理。", raw),
    };
  }

  return {
    ok: true,
    data: {
      title,
      body,
      tags: asStringArray(value.tags),
      imageSuggestion: asStringArray(value.imageSuggestion),
      citations: parseCitations(value.citations),
      changeNotes: asStringArray(value.changeNotes),
      unresolved: asStringArray(value.unresolved),
    },
  };
}
