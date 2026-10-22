import type { BrandConfig, Brief, FactCard } from "@/lib/domain/types";
import { PROMPT_VERSION } from "@/lib/domain/types";
import { brandBlock, briefBlock, factsBlock } from "./shared";

const SYSTEM = `你是一名中文小红书文旅文案写手。请根据品牌资料、活动 Brief 和事实资料，写一篇自然、具体、适合发布的小红书图文笔记。

要求：
- 只使用提供的资料，不要编造价格、日期、人数、赠品或效果承诺。
- 不使用品牌禁用表达。
- 标题不超过 20 个汉字。
- 正文 250–700 字，开头具体，不要套话。
- 话题标签 3–6 个，每个以 # 开头。
- 配图建议 2–4 条，写具体画面。
- 直接输出以下四段，不要输出 JSON，不要输出额外解释：

标题：
（标题）

正文：
（正文）

话题：
（#标签1 #标签2 #标签3）

配图建议：
1. （画面）
2. （画面）`;

export function buildDirectMessages(input: {
  brand: BrandConfig;
  brief: Brief;
  facts: FactCard[];
}) {
  const user = `【品牌约束】
${brandBlock(input.brand)}

【活动 Brief】
${briefBlock(input.brief)}

【事实资料】
${factsBlock(input.facts)}

请按四段格式输出一篇小红书笔记。`;

  return {
    promptVersion: PROMPT_VERSION,
    messages: [
      { role: "system" as const, content: SYSTEM },
      { role: "user" as const, content: user },
    ],
  };
}
