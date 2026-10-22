import type {
  BrandConfig,
  Brief,
  DocumentVersion,
  FactCard,
  ModelIssue,
} from "@/lib/domain/types";
import { PROMPT_VERSION } from "@/lib/domain/types";
import {
  brandBlock,
  briefBlock,
  factsBlock,
  JSON_ONLY_RULE,
  versionBlock,
} from "./shared";

const SYSTEM = `你是定向修订编辑。你只修改用户选中的问题，不做无关重写。

硬性规则：
1. 保留原文中未被问题涉及的内容、语气和信息顺序。
2. 不得新增任何事实。价格、时间、人数、地点、服务承诺只能来自事实卡。
3. 保留仍然有效的 [F-xxx] 引用；如果修改了某句的依据，更新引用编号并在变更说明中说明。
4. 如果用户的修订指令与事实卡冲突，不要照做；在 unresolved 中说明冲突，并保留可核对的信息。
5. 修订后标题不超过 20 个汉字；正文 250–700 字；标签 3–6 个；配图建议 2–4 条。
6. 变更说明逐条对应选中的问题，写清楚“改了什么、为什么”。
7. ${JSON_ONLY_RULE}

输出 JSON 结构：
{
  "title": "修订后的标题",
  "body": "修订后的正文，保留 [F-xxx] 引用",
  "tags": ["#标签"],
  "imageSuggestion": ["画面"],
  "citations": [{ "factId": "F-101", "quote": "逐字原文", "usedFor": "用在哪一句" }],
  "changeNotes": ["对应 issueId 的修改说明"],
  "unresolved": ["未能解决的问题或与事实的冲突"]
}`;

export function buildReviseMessages(input: {
  brand: BrandConfig;
  brief: Brief;
  facts: FactCard[];
  version: DocumentVersion;
  issues: ModelIssue[];
  instruction: string;
}) {
  const issueBlock = input.issues
    .map(
      (issue) =>
        `[${issue.id}] ${issue.category}/${issue.severity}\n原文：${issue.quote}\n问题：${issue.problem}\n建议：${issue.suggestion}`,
    )
    .join("\n\n");

  const user = `【品牌约束】
${brandBlock(input.brand)}

【活动 Brief】
${briefBlock(input.brief)}

【事实卡片】
${factsBlock(input.facts)}

【当前文案】
${versionBlock(input.version)}

【选中的问题】
${issueBlock || "无，仅按修订指令做最小修改。"}

【修订指令】
${input.instruction || "针对选中的问题做最小必要修改。"}

请输出修订后的完整文案与变更说明。不要新增事实。

输出 JSON。`;

  return {
    promptVersion: PROMPT_VERSION,
    messages: [
      { role: "system" as const, content: SYSTEM },
      { role: "user" as const, content: user },
    ],
  };
}
