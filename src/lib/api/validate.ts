import {
  FACT_CATEGORIES,
  type BrandConfig,
  type Brief,
  type Citation,
  type FactCard,
  type IssueCategory,
  type IssueSeverity,
  type MandatoryPoint,
  type ModelIssue,
} from "@/lib/domain/types";
import { isRecord } from "@/lib/llm/json";
import { RequestValidationError } from "./respond";

const FACT_ID = /^F-\d{3}$/;
const SOURCE_TYPES = ["模拟资料", "官方资料", "内部文档", "公开资料"] as const;
const ISSUE_CATEGORIES: IssueCategory[] = [
  "事实依据",
  "品牌语气",
  "人群匹配",
  "结构表达",
  "合规风险",
  "其他",
];
const SEVERITIES: IssueSeverity[] = ["error", "warning", "info"];

function fail(message: string, hint?: string): never {
  throw new RequestValidationError(message, hint);
}

function text(
  value: unknown,
  field: string,
  options?: { max?: number; allowEmpty?: boolean },
): string {
  if (typeof value !== "string") {
    fail(`${field} 必须是字符串。`);
  }
  const trimmed = value.trim();
  if (!options?.allowEmpty && trimmed.length === 0) {
    fail(`${field} 不能为空。`);
  }
  if (trimmed.length > (options?.max ?? 20_000)) {
    fail(`${field} 太长，请精简后再试。`);
  }
  return trimmed;
}

function textArray(
  value: unknown,
  field: string,
  options?: { maxItems?: number; maxLength?: number },
): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail(`${field} 必须是数组。`);
  if (value.length > (options?.maxItems ?? 100)) {
    fail(`${field} 数量过多。`);
  }
  return value
    .map((item, index) => text(item, `${field}[${index}]`, {
      max: options?.maxLength ?? 500,
      allowEmpty: false,
    }))
    .filter(Boolean);
}

export function parseBrief(value: unknown): Brief {
  if (!isRecord(value)) fail("brief 必须是一个对象。");
  return {
    campaignName: text(value.campaignName, "活动名称", { max: 200 }),
    product: text(value.product, "推广对象", { max: 200 }),
    goal: text(value.goal, "活动目标", { max: 300 }),
    audience: text(value.audience, "目标人群", { max: 500 }),
    sellingPoints: text(value.sellingPoints, "核心卖点", { max: 4000 }),
    toneOverride: text(value.toneOverride, "语气补充", {
      max: 1000,
      allowEmpty: true,
    }),
    constraints: text(value.constraints, "内容限制", {
      max: 2000,
      allowEmpty: true,
    }),
    channel: "小红书",
  };
}

export function parseBrand(value: unknown): BrandConfig {
  if (!isRecord(value)) fail("brand 必须是一个对象。");

  const mandatoryRaw = value.mandatoryPoints;
  if (mandatoryRaw !== undefined && !Array.isArray(mandatoryRaw)) {
    fail("brand.mandatoryPoints 必须是数组。");
  }
  const mandatoryPoints: MandatoryPoint[] = (mandatoryRaw ?? [])
    .slice(0, 30)
    .map((item, index) => {
      if (!isRecord(item)) fail(`必提信息第 ${index + 1} 项格式不正确。`);
      return {
        id: text(item.id ?? `M-${index + 1}`, "必提信息 id", { max: 40 }),
        text: text(item.text, "必提信息文本", { max: 300 }),
        keywords: textArray(item.keywords, "必提信息关键词", {
          maxItems: 20,
          maxLength: 60,
        }),
        match: item.match === "any" ? "any" : "all",
      };
    });

  return {
    name: text(value.name, "品牌名称", { max: 100 }),
    tagline: text(value.tagline, "品牌定位", { max: 500 }),
    audience: text(value.audience, "品牌目标人群", { max: 500 }),
    toneKeywords: textArray(value.toneKeywords, "语气关键词", {
      maxItems: 20,
      maxLength: 30,
    }),
    toneNote: text(value.toneNote, "语气说明", {
      max: 2000,
      allowEmpty: true,
    }),
    mandatoryPoints,
    bannedPhrases: textArray(value.bannedPhrases, "禁用表达", {
      maxItems: 80,
      maxLength: 60,
    }),
    writingRules: textArray(value.writingRules, "写作约束", {
      maxItems: 40,
      maxLength: 300,
    }),
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

export function parseFacts(value: unknown): FactCard[] {
  if (!Array.isArray(value)) fail("facts 必须是数组。");
  if (value.length === 0) fail("至少需要选择 1 张事实卡。");
  if (value.length > 40) fail("一次最多使用 40 张事实卡。");

  const ids = new Set<string>();
  return value.map((item, index) => {
    if (!isRecord(item)) fail(`第 ${index + 1} 张事实卡格式不正确。`);
    const id = text(item.id, "事实卡编号", { max: 10 });
    if (!FACT_ID.test(id)) {
      fail(`事实卡编号「${id}」格式不正确，应形如 F-101。`);
    }
    if (ids.has(id)) fail(`事实卡编号重复：${id}。`);
    ids.add(id);

    const category = text(item.category, "事实卡分类", { max: 20 });
    if (!FACT_CATEGORIES.includes(category as (typeof FACT_CATEGORIES)[number])) {
      fail(`事实卡 ${id} 的分类「${category}」不在允许范围内。`);
    }

    const status = item.status === "archived" ? "archived" : "active";
    const sourceType = SOURCE_TYPES.includes(
      item.sourceType as (typeof SOURCE_TYPES)[number],
    )
      ? (item.sourceType as (typeof SOURCE_TYPES)[number])
      : "模拟资料";

    return {
      id,
      title: text(item.title, `事实卡 ${id} 标题`, { max: 200 }),
      content: text(item.content, `事实卡 ${id} 内容`, { max: 3000 }),
      category: category as FactCard["category"],
      sourceName: text(item.sourceName, `事实卡 ${id} 来源`, { max: 200 }),
      sourceType,
      tags: textArray(item.tags, `事实卡 ${id} 标签`, {
        maxItems: 20,
        maxLength: 40,
      }),
      status,
      updatedAt:
        typeof item.updatedAt === "string"
          ? item.updatedAt
          : new Date().toISOString(),
    };
  });
}

export function parseContext(body: Record<string, unknown>) {
  return {
    brief: parseBrief(body.brief),
    brand: parseBrand(body.brand),
    facts: parseFacts(body.facts),
  };
}

export function parseCitations(value: unknown): Citation[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail("citations 必须是数组。");
  if (value.length > 40) fail("引用数量过多。");
  return value.map((item, index) => {
    if (!isRecord(item)) fail(`第 ${index + 1} 条引用格式不正确。`);
    const factId = text(item.factId, "引用编号", { max: 10 });
    if (!FACT_ID.test(factId)) fail(`引用编号「${factId}」格式不正确。`);
    return {
      factId,
      quote: text(item.quote, "引用原文", {
        max: 2000,
        allowEmpty: true,
      }),
      usedFor: text(item.usedFor, "引用用途", {
        max: 500,
        allowEmpty: true,
      }),
    };
  });
}

export type VersionPayload = {
  candidate: "A" | "B";
  title: string;
  body: string;
  tags: string[];
  imageSuggestion: string[];
  citations: Citation[];
};

export function parseVersion(value: unknown): VersionPayload {
  if (!isRecord(value)) fail("version 必须是一个对象。");
  return {
    candidate: value.candidate === "B" ? "B" : "A",
    title: text(value.title, "文案标题", { max: 200 }),
    body: text(value.body, "文案正文", { max: 8000 }),
    tags: textArray(value.tags, "话题标签", {
      maxItems: 20,
      maxLength: 60,
    }),
    imageSuggestion: textArray(value.imageSuggestion, "配图建议", {
      maxItems: 10,
      maxLength: 500,
    }),
    citations: parseCitations(value.citations),
  };
}

export function parseIssues(value: unknown): ModelIssue[] {
  if (!Array.isArray(value)) fail("issues 必须是数组。");
  if (value.length > 12) fail("一次最多选择 12 条问题。");
  return value.map((item, index) => {
    if (!isRecord(item)) fail(`第 ${index + 1} 条问题格式不正确。`);
    const category = ISSUE_CATEGORIES.includes(item.category as IssueCategory)
      ? (item.category as IssueCategory)
      : "其他";
    const severity = SEVERITIES.includes(item.severity as IssueSeverity)
      ? (item.severity as IssueSeverity)
      : "warning";
    const confidence =
      item.confidence === "high" || item.confidence === "low"
        ? item.confidence
        : "medium";
    const status =
      item.status === "resolved" || item.status === "dismissed"
        ? item.status
        : "open";
    return {
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : `issue-${index + 1}`,
      category,
      severity,
      quote: text(item.quote, "问题原文", {
        max: 1000,
        allowEmpty: true,
      }),
      problem: text(item.problem, "问题描述", { max: 2000 }),
      evidenceFactIds: textArray(item.evidenceFactIds, "问题依据", {
        maxItems: 10,
        maxLength: 10,
      }).filter((id) => FACT_ID.test(id)),
      suggestion: text(item.suggestion, "修改建议", {
        max: 2000,
        allowEmpty: true,
      }),
      confidence,
      status,
      dismissReason:
        typeof item.dismissReason === "string"
          ? item.dismissReason.slice(0, 500)
          : undefined,
    };
  });
}
