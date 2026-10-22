import {
  FACT_CATEGORIES,
  type FactCard,
  type FactCategory,
  type FactSourceType,
} from "@/lib/domain/types";

const FACT_ID = /^F-\d{3}$/;
const SOURCE_TYPES: FactSourceType[] = [
  "模拟资料",
  "官方资料",
  "内部文档",
  "公开资料",
];

export type FactParseResult = {
  facts: FactCard[];
  errors: string[];
  warnings: string[];
};

export function nextFactId(facts: FactCard[]): string {
  const used = new Set(facts.map((fact) => fact.id));
  const numbers = facts
    .map((fact) => Number.parseInt(fact.id.replace(/^F-/, ""), 10))
    .filter((value) => Number.isFinite(value));
  let next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  while (used.has(`F-${String(next).padStart(3, "0")}`)) next += 1;
  return `F-${String(next).padStart(3, "0")}`;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,，、;；]/)
      .map((item) => item.trim().replace(/^#/, ""))
      .filter(Boolean);
  }
  return [];
}

function normalizeCategory(value: string): FactCategory | null {
  const trimmed = value.trim();
  if (FACT_CATEGORIES.includes(trimmed as FactCategory)) {
    return trimmed as FactCategory;
  }
  return null;
}

function normalizeSourceType(value: string): FactSourceType {
  return SOURCE_TYPES.includes(value as FactSourceType)
    ? (value as FactSourceType)
    : "模拟资料";
}

function normalizeFact(
  value: unknown,
  index: number,
  errors: string[],
  seenIds: Set<string>,
): FactCard | null {
  if (!value || typeof value !== "object") {
    errors.push(`第 ${index + 1} 条不是对象。`);
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = asString(record.id).toUpperCase();
  const title = asString(record.title);
  const content = asString(record.content);
  const sourceName = asString(record.sourceName);
  const categoryRaw = asString(record.category);
  const category = normalizeCategory(categoryRaw);
  const localErrors: string[] = [];

  if (!FACT_ID.test(id)) {
    localErrors.push(
      `第 ${index + 1} 条编号「${id || "空"}」格式不正确，应形如 F-101。`,
    );
  }
  if (id && seenIds.has(id)) {
    localErrors.push(`编号 ${id} 重复。`);
  }
  if (!title) localErrors.push(`${id || `第 ${index + 1} 条`} 缺少标题。`);
  if (!content) localErrors.push(`${id || `第 ${index + 1} 条`} 缺少原文。`);
  if (!sourceName) {
    localErrors.push(`${id || `第 ${index + 1} 条`} 缺少来源名称。`);
  }
  if (!category) {
    localErrors.push(
      `${id || `第 ${index + 1} 条`} 的分类「${categoryRaw || "空"}」不在允许范围：${FACT_CATEGORIES.join("、")}。`,
    );
  }
  if (localErrors.length > 0) {
    errors.push(...localErrors);
    return null;
  }

  seenIds.add(id);
  return {
    id,
    title,
    content,
    category: category as FactCategory,
    sourceName,
    sourceType: normalizeSourceType(asString(record.sourceType)),
    tags: asStringArray(record.tags),
    status: asString(record.status) === "archived" ? "archived" : "active",
    updatedAt:
      typeof record.updatedAt === "string" && record.updatedAt
        ? record.updatedAt
        : new Date().toISOString(),
  };
}

function parseJsonFacts(raw: string, errors: string[]): unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { facts?: unknown }).facts)
    ) {
      return (parsed as { facts: unknown[] }).facts;
    }
    errors.push("JSON 必须是事实卡数组，或包含 facts 数组的对象。");
    return null;
  } catch {
    return null;
  }
}

function parseTextFacts(raw: string, errors: string[]): unknown[] {
  const blocks = raw
    .split(/\n\s*---+\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const facts: unknown[] = [];

  blocks.forEach((block, blockIndex) => {
    const lines = block.split(/\r?\n/);
    const header = lines[0]?.match(/^\[?(F-\d{3})\]?\s*(.+)$/i);
    if (!header) {
      errors.push(
        `第 ${blockIndex + 1} 段缺少标题行，应形如「[F-401] 事实卡标题」。`,
      );
      return;
    }
    const fact: Record<string, unknown> = {
      id: header[1],
      title: header[2].trim(),
    };
    let contentBuffer: string[] = [];
    let readingContent = false;

    for (const line of lines.slice(1)) {
      const match = line.match(
        /^(分类|来源|来源类型|标签|状态|原文)\s*[：:]\s*(.*)$/,
      );
      if (match) {
        const key = match[1];
        const value = match[2];
        if (key === "原文") {
          readingContent = true;
          if (value.trim()) contentBuffer.push(value.trim());
          continue;
        }
        readingContent = false;
        if (key === "分类") fact.category = value.trim();
        if (key === "来源") fact.sourceName = value.trim();
        if (key === "来源类型") fact.sourceType = value.trim();
        if (key === "标签") fact.tags = value.trim();
        if (key === "状态") {
          fact.status = /归档|停用|archived/i.test(value) ? "archived" : "active";
        }
        continue;
      }
      if (readingContent) contentBuffer.push(line);
    }

    fact.content = contentBuffer.join("\n").trim();
    facts.push(fact);
  });

  return facts;
}

export function parseFactInput(raw: string): FactParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmed = raw.trim();

  if (!trimmed) {
    return { facts: [], errors: ["导入内容为空。"], warnings };
  }

  let items: unknown[] | null = null;
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    items = parseJsonFacts(trimmed, errors);
    if (!items) {
      // JSON 解析失败时，继续尝试文本格式，避免误报。
      items = null;
    }
  }
  if (!items) {
    items = parseTextFacts(trimmed, errors);
  }

  const facts: FactCard[] = [];
  const seenIds = new Set<string>();
  items.forEach((item, index) => {
    const before = errors.length;
    const fact = normalizeFact(item, index, errors, seenIds);
    if (fact && errors.length === before) facts.push(fact);
  });

  if (facts.length === 0 && errors.length === 0) {
    errors.push("没有解析出可导入的事实卡。");
  }
  if (facts.some((fact) => fact.status === "archived")) {
    warnings.push("导入内容包含归档资料，导入后仍会在检索中降权。");
  }

  return { facts, errors, warnings };
}

export const FACT_IMPORT_TEMPLATE = `[F-401] 事实卡标题
分类：产品信息
来源：产品手册（模拟资料）
来源类型：模拟资料
标签：岳麓山, 夜游, 示例
状态：启用
原文：
这里填写可核对的事实原文。可以多行。
价格、时间、人数、服务承诺应逐条写清楚。

---
[F-402] 第二张事实卡
分类：价格政策
来源：价格表（模拟资料）
来源类型：模拟资料
标签：价格
状态：启用
原文：
成人 100 元/人，费用包含讲解，不含餐饮。`;
