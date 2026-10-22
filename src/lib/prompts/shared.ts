import type {
  BrandConfig,
  Brief,
  DocumentVersion,
  FactCard,
} from "@/lib/domain/types";

export function brandBlock(brand: BrandConfig): string {
  const mandatory = brand.mandatoryPoints
    .map(
      (point) =>
        `- ${point.text}（必须覆盖的关键词：${point.keywords.join("、") || "无"}；匹配方式：${point.match === "all" ? "全部出现" : "任一出现"}）`,
    )
    .join("\n");

  return [
    `品牌名称：${brand.name}`,
    `品牌定位：${brand.tagline}`,
    `目标人群：${brand.audience}`,
    `语气关键词：${brand.toneKeywords.join("、")}`,
    `语气说明：${brand.toneNote}`,
    "必提信息：",
    mandatory || "- 无",
    `品牌禁用表达：${brand.bannedPhrases.join("、") || "无"}`,
    "写作约束：",
    ...brand.writingRules.map((rule) => `- ${rule}`),
  ].join("\n");
}

export function briefBlock(brief: Brief): string {
  return [
    `活动名称：${brief.campaignName}`,
    `推广对象：${brief.product}`,
    `活动目标：${brief.goal}`,
    `目标人群：${brief.audience}`,
    `核心卖点：${brief.sellingPoints.replace(/\n/g, "；")}`,
    `语气补充：${brief.toneOverride || "无"}`,
    `内容限制：${brief.constraints || "无"}`,
    `发布渠道：${brief.channel}`,
  ].join("\n");
}

export function factsBlock(facts: FactCard[]): string {
  return facts
    .map(
      (fact) =>
        `[${fact.id}] ${fact.title}\n分类：${fact.category}\n来源：${fact.sourceName}\n原文：${fact.content}`,
    )
    .join("\n\n");
}

export function versionBlock(version: DocumentVersion): string {
  return [
    `标题：${version.title}`,
    `正文：\n${version.body}`,
    `话题标签：${version.tags.join(" ")}`,
    `配图建议：\n${version.imageSuggestion
      .map((item, index) => `${index + 1}. ${item}`)
      .join("\n")}`,
    `引用映射：${JSON.stringify(version.citations)}`,
  ].join("\n\n");
}

export const JSON_ONLY_RULE =
  "只输出一个合法的 JSON 对象，不要输出 Markdown 代码围栏、解释文字或前后缀。所有字符串使用双引号。";
