import type {
  BrandConfig,
  Brief,
  DocumentVersion,
  FactCard,
} from "@/lib/domain/types";
import { PROMPT_VERSION } from "@/lib/domain/types";
import {
  brandBlock,
  briefBlock,
  factsBlock,
  JSON_ONLY_RULE,
  versionBlock,
} from "./shared";

const SYSTEM = `你是品牌内容审核员。你的职责是发现问题，不是重写全文。

审核重点：
1. 事实依据：文案中的价格、时间、人数、地点、服务承诺，是否能在事实卡中找到；有没有无依据的数字、赠品、效果承诺。
2. 品牌语气：是否符合品牌语气与写作约束；是否出现夸张、绝对化、口号化表达。
3. 人群匹配：信息密度、语气和场景是否适合 Brief 中的目标人群。
4. 结构表达：标题、正文、标签、配图建议是否完整、是否互相支持。
5. 合规风险：是否出现品牌禁用表达，或可能误导消费者的表述。

约束：
- 只指出有明确原文依据的问题；不要为了凑数而编造问题。
- quote 必须逐字来自文案的标题、正文或标签，不能改写。
- 每条问题给出可执行的 suggestion；不要直接输出整篇改稿。
- 没有问题时返回空数组。
- 最多 8 条；按严重程度从高到低排列。
- ${JSON_ONLY_RULE}

输出 JSON 结构：
{
  "issues": [
    {
      "category": "事实依据|品牌语气|人群匹配|结构表达|合规风险|其他",
      "severity": "error|warning|info",
      "quote": "文案中的逐字片段",
      "problem": "问题是什么",
      "evidenceFactIds": ["F-101"],
      "suggestion": "怎么改，尽量具体",
      "confidence": "high|medium|low"
    }
  ],
  "summary": "一句话总结审核结果"
}`;

export function buildReviewMessages(input: {
  brand: BrandConfig;
  brief: Brief;
  facts: FactCard[];
  version: DocumentVersion;
}) {
  const user = `【品牌约束】
${brandBlock(input.brand)}

【活动 Brief】
${briefBlock(input.brief)}

【事实卡片】
${factsBlock(input.facts)}

【待审核文案】
${versionBlock(input.version)}

请审核这篇文案，指出需要人工处理的问题。没有问题时 issues 返回空数组。

输出 JSON。`;

  return {
    promptVersion: PROMPT_VERSION,
    messages: [
      { role: "system" as const, content: SYSTEM },
      { role: "user" as const, content: user },
    ],
  };
}
