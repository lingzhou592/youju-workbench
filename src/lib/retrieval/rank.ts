import type { Brief, FactCard } from "@/lib/domain/types";
import { normalizeText, termsFromBriefFields, tokenize } from "./tokenize";

export type RankedFact = {
  fact: FactCard;
  score: number;
  matchedTerms: string[];
  reasons: string[];
};

const CATEGORY_HINTS: Record<string, string[]> = {
  品牌信息: ["品牌", "小团", "定位", "长沙"],
  产品信息: ["产品", "线路", "路线", "行程", "散步", "徒步", "陶艺"],
  时间排期: ["时间", "集合", "出发", "场次", "周五", "周六", "周日", "月", "日"],
  价格政策: ["价格", "元", "学生价", "费用", "优惠", "包含"],
  人群洞察: ["大学生", "亲子", "孩子", "家长", "上班族", "人群", "岁"],
  体验细节: ["体验", "故事", "讲解", "停留", "观星", "陶艺", "马灯"],
  交通提示: ["交通", "地铁", "自驾", "停车", "集合点", "信号"],
  服务承诺: ["报名", "小程序", "退款", "改期", "余量", "服务", "成行"],
  用户反馈: ["反馈", "满意度", "推荐", "回访", "试运营"],
};

function buildTermWeights(
  facts: FactCard[],
  terms: string[],
): Map<string, number> {
  const weights = new Map<string, number>();
  for (const term of terms) {
    let documentFrequency = 0;
    for (const fact of facts) {
      const haystack = `${fact.title} ${fact.tags.join(" ")} ${fact.content} ${fact.category}`.toLowerCase();
      if (haystack.includes(term)) documentFrequency += 1;
    }
    // 逆文档频率：越常见的词（价格、报名等）权重越低，越具体的词权重越高。
    weights.set(
      term,
      1 + Math.log((facts.length + 1) / (documentFrequency + 1)),
    );
  }
  return weights;
}

function scoreFact(
  fact: FactCard,
  terms: string[],
  weights: Map<string, number>,
  briefText: string,
): RankedFact {
  const title = fact.title.toLowerCase();
  const content = fact.content.toLowerCase();
  const tags = fact.tags.join(" ").toLowerCase();
  const category = fact.category.toLowerCase();

  let score = 0;
  const matched = new Set<string>();
  const reasons: string[] = [];

  for (const term of terms) {
    const weight = weights.get(term) ?? 1;
    let hit = 0;
    const where: string[] = [];
    if (title.includes(term)) {
      score += 6 * weight;
      hit += 1;
      where.push("标题");
    }
    if (tags.includes(term)) {
      score += 4 * weight;
      hit += 1;
      where.push("标签");
    }
    if (content.includes(term)) {
      score += 2 * weight;
      hit += 1;
      where.push("正文");
    }
    if (category.includes(term)) {
      score += 2 * weight;
      hit += 1;
      where.push("分类");
    }
    if (hit > 0) {
      matched.add(term);
      if (reasons.length < 4) reasons.push(`${where.join("/")}命中「${term}」`);
    }
  }

  const categoryHints = CATEGORY_HINTS[fact.category] ?? [];
  const categoryRelevant = categoryHints.some((hint) =>
    briefText.includes(hint),
  );
  if (categoryRelevant) {
    score += 12;
    if (reasons.length < 4) {
      reasons.push(`分类「${fact.category}」与 Brief 场景相关`);
    }
  }

  // 归档资料仍然参与检索，但显著降权，避免旧价格挤到推荐位。
  if (fact.status === "archived") score *= 0.35;

  return {
    fact,
    score: Math.round(score),
    matchedTerms: [...matched],
    reasons: reasons.length > 0 ? reasons : ["未命中关键词，供人工判断"],
  };
}

export function rankFacts(
  facts: FactCard[],
  brief: Brief,
  query?: string,
): RankedFact[] {
  const briefTerms = termsFromBriefFields([
    brief.campaignName,
    brief.product,
    brief.goal,
    brief.audience,
    brief.sellingPoints,
    brief.toneOverride,
    brief.constraints,
  ]);
  const extraTerms = query ? tokenize(query) : [];
  const terms = [...new Set([...briefTerms, ...extraTerms])];
  const weights = buildTermWeights(facts, terms);
  const briefText = [
    brief.campaignName,
    brief.product,
    brief.goal,
    brief.audience,
    brief.sellingPoints,
    brief.toneOverride,
    brief.constraints,
  ]
    .join(" ")
    .toLowerCase();

  return facts
    .map((fact) => scoreFact(fact, terms, weights, briefText))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.fact.updatedAt.localeCompare(a.fact.updatedAt);
    });
}

export function searchFacts(facts: FactCard[], query: string): FactCard[] {
  const normalized = normalizeText(query);
  if (!normalized) return facts;
  const terms = tokenize(query);
  return facts.filter((fact) => {
    const haystack = normalizeText(
      `${fact.id} ${fact.title} ${fact.content} ${fact.sourceName} ${fact.tags.join(" ")}`,
    );
    if (haystack.includes(normalized)) return true;
    return terms.some((term) => haystack.includes(term));
  });
}
