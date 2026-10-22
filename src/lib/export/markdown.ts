import type {
  ConfirmationRecord,
  DocumentVersion,
  ReviewRecord,
  Run,
} from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { stripCitations } from "@/lib/review/citations";
import { ruleStatusLabel } from "@/lib/review/rules";

function escapeTable(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

function statusLabel(
  version: DocumentVersion,
  confirmation?: ConfirmationRecord,
): string {
  return confirmation
    ? `已人工确认（定稿）· ${formatDateTime(confirmation.createdAt)}`
    : "草稿（未经人工确认）";
}

function toFootnotes(body: string): string {
  return body.replace(/\[F-(\d{3})\]/g, (_, number: string) => `[^F-${number}]`);
}

export function buildPublishText(version: DocumentVersion): string {
  const lines = [
    `标题：${version.title}`,
    "",
    stripCitations(version.body),
    "",
    version.tags.join(" "),
  ];
  if (version.imageSuggestion.length > 0) {
    lines.push("", "配图建议：");
    version.imageSuggestion.forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`);
    });
  }
  return lines.join("\n").trim();
}

export function runToMarkdown(
  run: Run,
  version: DocumentVersion,
  review?: ReviewRecord,
  confirmation?: ConfirmationRecord,
  options?: { includePublishCopy?: boolean },
): string {
  const { brief, brand, facts } = run.input;
  const angle =
    run.generation.titles.find((title) => title.id === version.candidate)
      ?.angle ?? "未标注";
  const model = run.generation.modelMeta;
  const isDraft = !confirmation;

  const citationIds = [
    ...new Set([
      ...version.citations.map((citation) => citation.factId),
      ...[...version.body.matchAll(/\[F-(\d{3})\]/g)].map(
        (match) => `F-${match[1]}`,
      ),
    ]),
  ];

  const lines: string[] = [];
  lines.push(`# ${version.title}`, "");
  lines.push("> 有据 · 文旅营销素材生成与校验工作台");
  lines.push(`> 品牌：${brand.name}（虚构演示品牌，资料为模拟内容）`);
  lines.push(`> 活动：${brief.campaignName || run.title || "未命名活动"}`);
  lines.push(`> 候选：${version.candidate} · ${angle}`);
  lines.push(`> 状态：${statusLabel(version, confirmation)}`);
  lines.push(
    `> 模型：${
      run.sample
        ? "内置示例（非模型实时生成）"
        : model
          ? `${model.model} · ${(model.latencyMs / 1000).toFixed(1)}s`
          : "未记录"
    }`,
  );
  lines.push(`> 导出时间：${formatDateTime(new Date().toISOString())}`);
  if (isDraft) {
    lines.push("> 注意：这是未确认草稿，不应直接发布。");
  }
  lines.push("");

  if (options?.includePublishCopy !== false) {
    lines.push("## 发布文案（无引用标记）", "");
    lines.push(`**标题**：${version.title}`, "");
    lines.push(stripCitations(version.body), "");
    if (version.tags.length > 0) {
      lines.push(`**话题标签**：${version.tags.join(" ")}`, "");
    }
    if (version.imageSuggestion.length > 0) {
      lines.push("**配图建议**：", "");
      version.imageSuggestion.forEach((item, index) => {
        lines.push(`${index + 1}. ${item}`);
      });
      lines.push("");
    }
  }

  lines.push("## 完整正文（含引用标记）", "");
  lines.push(toFootnotes(version.body), "");
  if (version.tags.length > 0) {
    lines.push(`**话题标签**：${version.tags.join(" ")}`, "");
  }

  if (citationIds.length > 0) {
    lines.push("## 事实依据", "");
    lines.push("| 编号 | 标题 | 分类 | 来源 | 原文 |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const id of citationIds) {
      const fact = facts.find((item) => item.id === id);
      const citation = version.citations.find((item) => item.factId === id);
      const quote = citation?.quote?.trim();
      lines.push(
        fact
          ? `| ${id} | ${escapeTable(fact.title)} | ${escapeTable(
              fact.category,
            )} | ${escapeTable(fact.sourceName)} | ${escapeTable(
              quote ? `引用摘录：${quote}｜原文：${fact.content}` : fact.content,
            )} |`
          : `| ${id} | 未在快照中找到 | — | — | — |`,
      );
    }
    lines.push("");
    lines.push("脚注：", "");
    for (const id of citationIds) {
      const fact = facts.find((item) => item.id === id);
      lines.push(
        `[^F-${id.replace("F-", "")}]: ${
          fact
            ? `${fact.id} · ${fact.title}（${fact.sourceName}）—— ${fact.content}`
            : `${id} 未在资料快照中找到`
        }`,
      );
    }
    lines.push("");
  }

  lines.push("## 校验记录", "");
  if (review) {
    lines.push("### 规则检查", "");
    lines.push("| 状态 | 检查项 | 说明 |");
    lines.push("| --- | --- | --- |");
    for (const check of review.ruleChecks) {
      lines.push(
        `| ${ruleStatusLabel(check.status)} | ${escapeTable(
          check.label,
        )} | ${escapeTable(check.detail)} |`,
      );
    }
    if (review.ruleChecks.some((check) => check.evidence)) {
      lines.push("", "**规则明细**", "");
      for (const check of review.ruleChecks) {
        if (!check.evidence) continue;
        lines.push(`- ${check.label}：`);
        for (const line of check.evidence.split("\n")) {
          lines.push(`  - ${line}`);
        }
      }
    }
    lines.push("");
    lines.push("### 模型建议", "");
    if (review.modelIssues === null) {
      lines.push(
        review.modelError
          ? `模型审核未完成：${review.modelError.message}`
          : "模型审核尚未运行。",
      );
    } else if (review.modelIssues.length === 0) {
      lines.push("模型未提出需要处理的问题。");
    } else {
      for (const issue of review.modelIssues) {
        lines.push(
          `- [${issue.severity}] ${issue.category}｜${issue.problem}`,
        );
        if (issue.quote) lines.push(`  - 原文：${issue.quote}`);
        if (issue.evidenceFactIds.length > 0) {
          lines.push(`  - 依据：${issue.evidenceFactIds.join("、")}`);
        }
        if (issue.suggestion) lines.push(`  - 建议：${issue.suggestion}`);
        lines.push(
          `  - 状态：${
            issue.status === "open"
              ? "待处理"
              : issue.status === "resolved"
                ? "已处理"
                : `已忽略${issue.dismissReason ? `（${issue.dismissReason}）` : ""}`
          }`,
        );
      }
    }
    lines.push("");
  } else {
    lines.push("尚未生成规则检查记录。", "");
  }

  lines.push("### 人工确认", "");
  if (confirmation) {
    lines.push(`- 确认时间：${formatDateTime(confirmation.createdAt)}`);
    lines.push(`- 事实准确：${confirmation.checklist.factsAccurate ? "是" : "否"}`);
    lines.push(`- 语气符合品牌：${confirmation.checklist.toneFits ? "是" : "否"}`);
    lines.push(
      `- 信息完整：${confirmation.checklist.informationComplete ? "是" : "否"}`,
    );
    lines.push(
      `- 适合实际发布：${confirmation.checklist.readyToPublish ? "是" : "否"}`,
    );
    lines.push(`- 备注：${confirmation.note}`);
    if (confirmation.overrideReason) {
      lines.push(`- 规则未通过仍确认的原因：${confirmation.overrideReason}`);
    }
  } else {
    lines.push("尚未进行人工确认。");
  }
  lines.push("");

  lines.push("## 修订记录", "");
  const candidateVersions = run.versions
    .filter((item) => item.candidate === version.candidate)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const item of candidateVersions) {
    const marker = item.id === version.id ? "（当前导出）" : "";
    lines.push(
      `- ${formatDateTime(item.createdAt)} · 版本 ${
        candidateVersions.indexOf(item) + 1
      } · ${item.source}${marker}`,
    );
    if (item.revisionNotes && item.revisionNotes.length > 0) {
      for (const note of item.revisionNotes) lines.push(`  - ${note}`);
    }
  }
  lines.push("");

  lines.push("## 输入快照", "");
  lines.push(`- 活动名称：${brief.campaignName}`);
  lines.push(`- 推广对象：${brief.product}`);
  lines.push(`- 活动目标：${brief.goal}`);
  lines.push(`- 目标人群：${brief.audience}`);
  lines.push(`- 核心卖点：${brief.sellingPoints.replace(/\n/g, " / ")}`);
  if (brief.toneOverride) lines.push(`- 语气补充：${brief.toneOverride}`);
  if (brief.constraints) lines.push(`- 内容限制：${brief.constraints}`);
  lines.push(`- 使用事实卡：${facts.length} 张`);
  lines.push("");

  lines.push("---", "");
  lines.push(
    "说明：本文件中的品牌、价格、排期、服务承诺均为演示用模拟资料；“引用可定位”指能在本次运行的事实卡快照中回查，不代表已在现实世界核实。模型建议未经独立验证，需人工判断。",
  );

  return lines.join("\n");
}
