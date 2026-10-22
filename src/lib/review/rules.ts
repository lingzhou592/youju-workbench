import type {
  RuleCheck,
  RuleContext,
  RuleStatus,
} from "@/lib/domain/types";
import { normalizeText } from "@/lib/retrieval/tokenize";
import { findAbsolutePhrases } from "./absolute";
import { extractCitationIds, quoteInFact } from "./citations";
import { checkNumericClaims } from "./numbers";

function countChars(value: string): number {
  return Array.from(value.replace(/\s/g, "")).length;
}

function check(
  id: string,
  label: string,
  status: RuleStatus,
  detail: string,
  evidence?: string,
): RuleCheck {
  return { id, label, status, detail, evidence };
}

function contextAround(
  normalizedText: string,
  normalizedPhrase: string,
  radius = 14,
): string {
  const index = normalizedText.indexOf(normalizedPhrase);
  if (index < 0) return "";
  const start = Math.max(0, index - radius);
  const end = Math.min(
    normalizedText.length,
    index + normalizedPhrase.length + radius,
  );
  return `${start > 0 ? "…" : ""}${normalizedText.slice(start, end)}${
    end < normalizedText.length ? "…" : ""
  }`;
}

export function runRuleChecks(context: RuleContext): RuleCheck[] {
  const { version, brand, facts, titles } = context;
  const checks: RuleCheck[] = [];

  const title = version.title.trim();
  const body = version.body.trim();
  const tags = version.tags.map((tag) => tag.trim()).filter(Boolean);
  const copy = `${title}\n${body}\n${tags.join(" ")}`;
  const copyNormalized = normalizeText(copy);

  // 标题长度
  const titleLength = countChars(title);
  let titleStatus: RuleStatus = "pass";
  if (titleLength < 4 || titleLength > 24) titleStatus = "fail";
  else if (titleLength < 6 || titleLength > 20) titleStatus = "warn";
  checks.push(
    check(
      "title-length",
      "标题长度",
      titleStatus,
      `标题 ${titleLength} 字（建议 6–20 字，上限 24 字）`,
    ),
  );

  // 正文长度
  const bodyLength = countChars(body.replace(/\s?\[F-\d{3}\]/g, ""));
  let bodyStatus: RuleStatus = "pass";
  if (bodyLength < 150 || bodyLength > 1000) bodyStatus = "fail";
  else if (bodyLength < 250 || bodyLength > 700) bodyStatus = "warn";
  checks.push(
    check(
      "body-length",
      "正文长度",
      bodyStatus,
      `正文约 ${bodyLength} 字（建议 250–700 字，平台上限 1000 字）`,
    ),
  );

  // 话题标签
  const tagCount = tags.length;
  const allHash = tags.every((tag) => tag.startsWith("#"));
  const uniqueTags = new Set(tags.map((tag) => tag.replace(/\s/g, ""))).size;
  let tagStatus: RuleStatus = "pass";
  const tagNotes: string[] = [`${tagCount} 个标签（建议 3–6 个）`];
  if (tagCount === 0 || tagCount > 8) tagStatus = "fail";
  else if (tagCount < 3 || tagCount > 6) tagStatus = "warn";
  if (tagCount > 0 && !allHash) {
    tagStatus = tagStatus === "fail" ? "fail" : "warn";
    tagNotes.push("有标签未以 # 开头");
  }
  if (uniqueTags !== tagCount) {
    tagStatus = tagStatus === "fail" ? "fail" : "warn";
    tagNotes.push("存在重复标签");
  }
  checks.push(
    check("tags-format", "话题标签", tagStatus, tagNotes.join("；")),
  );

  // 必提信息
  if (brand.mandatoryPoints.length === 0) {
    checks.push(check("mandatory", "必提信息", "pass", "未设置必提信息"));
  } else {
    const missing: string[] = [];
    for (const point of brand.mandatoryPoints) {
      const keywords = (point.keywords.length > 0 ? point.keywords : [point.text])
        .map((keyword) => normalizeText(keyword))
        .filter(Boolean);
      const matched = keywords.filter((keyword) =>
        copyNormalized.includes(keyword),
      );
      const covered =
        point.match === "any"
          ? matched.length > 0
          : matched.length === keywords.length;
      if (!covered) {
        const absent = keywords.filter(
          (keyword) => !copyNormalized.includes(keyword),
        );
        missing.push(
          `${point.id}「${point.text}」缺少关键词：${absent.join("、")}`,
        );
      }
    }
    checks.push(
      missing.length > 0
        ? check(
            "mandatory",
            "必提信息",
            "fail",
            `未覆盖 ${missing.length} / ${brand.mandatoryPoints.length} 项必提信息`,
            missing.join("\n"),
          )
        : check(
            "mandatory",
            "必提信息",
            "pass",
            `${brand.mandatoryPoints.length} 项必提信息的关键词均已覆盖`,
          ),
    );
  }

  // 禁用表达
  const foundBanned = brand.bannedPhrases.filter((phrase) => {
    const normalized = normalizeText(phrase);
    return normalized.length > 0 && copyNormalized.includes(normalized);
  });
  checks.push(
    foundBanned.length > 0
      ? check(
          "banned-phrases",
          "禁用表达",
          "fail",
          `出现 ${foundBanned.length} 个品牌禁用表达`,
          foundBanned
            .map((phrase) => {
              const normalized = normalizeText(phrase);
              return `${phrase}：${contextAround(copyNormalized, normalized)}`;
            })
            .join("\n"),
        )
      : check(
          "banned-phrases",
          "禁用表达",
          "pass",
          `未发现 ${brand.bannedPhrases.length} 个品牌禁用表达`,
        ),
  );

  // 绝对化表达
  const absolute = findAbsolutePhrases(copyNormalized);
  checks.push(
    absolute.length > 0
      ? check(
          "absolute-claims",
          "绝对化表达",
          "fail",
          `检测到 ${absolute.length} 个内置绝对化表达`,
          absolute
            .map(
              (phrase) =>
                `${phrase}：${contextAround(copyNormalized, normalizeText(phrase))}`,
            )
            .join("\n"),
        )
      : check(
          "absolute-claims",
          "绝对化表达",
          "pass",
          "未检测到内置绝对化表达",
        ),
  );

  // 引用编号是否存在
  const bodyCitationIds = extractCitationIds(`${title}\n${body}`);
  const declaredCitationIds = version.citations.map(
    (citation) => citation.factId,
  );
  const allCitationIds = [
    ...new Set([...bodyCitationIds, ...declaredCitationIds]),
  ];
  const knownIds = new Set(facts.map((fact) => fact.id));
  const unknownIds = allCitationIds.filter((id) => !knownIds.has(id));
  if (unknownIds.length > 0) {
    checks.push(
      check(
        "citation-exists",
        "引用存在",
        "fail",
        `有 ${unknownIds.length} 个引用编号不在资料快照中`,
        unknownIds.join("、"),
      ),
    );
  } else if (allCitationIds.length === 0) {
    checks.push(
      check(
        "citation-exists",
        "引用存在",
        "warn",
        "正文与引用映射中都没有引用编号",
      ),
    );
  } else {
    checks.push(
      check(
        "citation-exists",
        "引用存在",
        "pass",
        `${allCitationIds.length} 个引用编号均可在资料快照中定位`,
      ),
    );
  }

  // 引用数量
  if (bodyCitationIds.length === 0) {
    checks.push(
      check(
        "citation-count",
        "引用数量",
        "fail",
        "正文没有引用标记，事实依据无法回查",
      ),
    );
  } else if (bodyCitationIds.length === 1) {
    checks.push(
      check(
        "citation-count",
        "引用数量",
        "warn",
        "正文只有 1 个引用，建议至少 2 个",
      ),
    );
  } else {
    checks.push(
      check(
        "citation-count",
        "引用数量",
        "pass",
        `正文有 ${bodyCitationIds.length} 个引用标记`,
      ),
    );
  }

  // 引用原文是否可定位
  if (version.citations.length === 0) {
    checks.push(
      check(
        "citation-quotes",
        "引用原文",
        "warn",
        bodyCitationIds.length > 0
          ? "正文有引用标记，但缺少引用原文映射"
          : "未提供引用原文映射",
      ),
    );
  } else {
    const problems: string[] = [];
    for (const citation of version.citations) {
      const fact = facts.find((item) => item.id === citation.factId);
      if (!fact) {
        problems.push(`${citation.factId} 不在资料快照中`);
        continue;
      }
      if (!citation.quote.trim()) {
        problems.push(`${citation.factId} 缺少原文摘录`);
        continue;
      }
      if (!quoteInFact(citation.quote, fact.content)) {
        problems.push(`${citation.factId} 的摘录无法在原文中定位`);
      }
    }
    checks.push(
      problems.length > 0
        ? check(
            "citation-quotes",
            "引用原文",
            "warn",
            `有 ${problems.length} 条引用原文需要人工核对`,
            problems.join("\n"),
          )
        : check(
            "citation-quotes",
            "引用原文",
            "pass",
            `${version.citations.length} 条引用原文均可在事实卡中定位`,
          ),
    );
  }

  // 数字是否有依据
  const numeric = checkNumericClaims(`${title}\n${body}`, facts);
  if (numeric.unsupported.length > 0) {
    const uniqueUnsupported = [
      ...new Map(
        numeric.unsupported.map((item) => [item.token, item]),
      ).values(),
    ];
    checks.push(
      check(
        "numeric-support",
        "数字依据",
        "fail",
        `有 ${uniqueUnsupported.length} 个数字无法在引用资料中找到`,
        uniqueUnsupported
          .slice(0, 4)
          .map((item) => `「${item.token}」出现在：${item.sentence}`)
          .join("\n"),
      ),
    );
  } else if (numeric.uncited.length > 0) {
    checks.push(
      check(
        "numeric-support",
        "数字依据",
        "warn",
        `有 ${numeric.uncited.length} 句含数字但未标注引用`,
        numeric.uncited
          .slice(0, 3)
          .map((item) => `「${item.token}」：${item.sentence}`)
          .join("\n"),
      ),
    );
  } else {
    checks.push(
      check(
        "numeric-support",
        "数字依据",
        "pass",
        numeric.totalTokens > 0
          ? `检查了 ${numeric.totalTokens} 个数字，均可在引用资料中定位`
          : "正文未出现阿拉伯数字",
      ),
    );
  }

  // 两个标题候选是否真的不同
  if (titles) {
    const [a, b] = titles;
    const normalizedA = normalizeText(a.title);
    const normalizedB = normalizeText(b.title);
    if (normalizedA === normalizedB) {
      checks.push(
        check(
          "title-difference",
          "标题候选差异",
          "fail",
          "两个候选标题内容相同，没有形成有效候选",
        ),
      );
    } else if (
      a.angle.trim().length > 0 &&
      a.angle.trim() === b.angle.trim()
    ) {
      checks.push(
        check(
          "title-difference",
          "标题候选差异",
          "warn",
          "两个候选标题的角度标签相同",
        ),
      );
    } else {
      checks.push(
        check(
          "title-difference",
          "标题候选差异",
          "pass",
          `A：${a.angle || "未标注"}；B：${b.angle || "未标注"}`,
        ),
      );
    }
  }

  // 标点
  const exclamationCount = (copy.match(/[！!]/g) || []).length;
  const consecutive = /[！!]{2,}/.test(copy);
  checks.push(
    consecutive
      ? check(
          "punctuation",
          "标点规范",
          "warn",
          "出现连续感叹号，建议改为陈述或只保留一个",
        )
      : exclamationCount > 2
        ? check(
            "punctuation",
            "标点规范",
            "warn",
            `感叹号 ${exclamationCount} 个，建议不超过 2 个`,
          )
        : check("punctuation", "标点规范", "pass", "感叹号使用克制"),
  );

  // 配图建议
  const images = version.imageSuggestion ?? [];
  const emptyImageWords = ["高级感", "氛围感", "出片", "绝美", "大片", "治愈"];
  const vagueImages = images.filter((item) =>
    emptyImageWords.some((word) => item.includes(word)),
  );
  if (images.length === 0) {
    checks.push(
      check(
        "image-suggestion",
        "配图建议",
        "warn",
        "未提供配图建议",
      ),
    );
  } else if (images.length < 2 || images.length > 4) {
    checks.push(
      check(
        "image-suggestion",
        "配图建议",
        "warn",
        `配图建议 ${images.length} 条（建议 2–4 条）`,
      ),
    );
  } else if (vagueImages.length > 0) {
    checks.push(
      check(
        "image-suggestion",
        "配图建议",
        "warn",
        "配图建议含空泛词，建议改成具体画面",
        vagueImages.join("\n"),
      ),
    );
  } else {
    checks.push(
      check(
        "image-suggestion",
        "配图建议",
        "pass",
        `配图建议 ${images.length} 条`,
      ),
    );
  }

  // 归档资料提醒
  const archivedFacts = facts.filter((fact) => fact.status === "archived");
  if (archivedFacts.length > 0) {
    checks.push(
      check(
        "archived-facts",
        "归档资料",
        "warn",
        `本次运行包含 ${archivedFacts.length} 张已归档资料，请确认是否仍然适用`,
        archivedFacts
          .map(
            (fact) =>
              `${fact.id}「${fact.title}」：${fact.content}`,
          )
          .join("\n"),
      ),
    );
  } else {
    checks.push(
      check(
        "archived-facts",
        "归档资料",
        "pass",
        "本次运行未使用归档资料",
      ),
    );
  }

  return checks;
}

export function summarizeRuleChecks(checks: RuleCheck[]) {
  const pass = checks.filter((item) => item.status === "pass").length;
  const warn = checks.filter((item) => item.status === "warn").length;
  const fail = checks.filter((item) => item.status === "fail").length;
  return {
    total: checks.length,
    pass,
    warn,
    fail,
    blocking: fail > 0,
    status: (fail > 0 ? "fail" : warn > 0 ? "warn" : "pass") as RuleStatus,
  };
}

export function ruleStatusLabel(status: RuleStatus): string {
  return status === "pass" ? "通过" : status === "warn" ? "提醒" : "未通过";
}
