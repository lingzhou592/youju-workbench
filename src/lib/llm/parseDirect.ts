export type DirectParseResult = {
  title: string;
  body: string;
  tags: string[];
  imageSuggestion: string[];
  raw: string;
  parseWarnings: string[];
};

const HEADING_RE =
  /^\s*(?:#{1,4}\s*)?(?:\*\*)?\s*(标题|正文|话题(?:标签)?|配图建议)\s*(?:\*\*)?\s*[：:]?\s*(.*)$/;

function cleanInline(value: string): string {
  return value
    .replace(/^\s*[-*]\s*/, "")
    .replace(/^\d+[.、)]\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
}

export function parseDirectOutput(raw: string): DirectParseResult {
  const warnings: string[] = [];
  const sections: Record<string, string[]> = {
    标题: [],
    正文: [],
    话题: [],
    配图建议: [],
  };

  let current: string | null = null;
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(HEADING_RE);
    if (match) {
      const key = match[1].startsWith("话题") ? "话题" : match[1];
      current = key;
      const inline = cleanInline(match[2]);
      if (inline) sections[key].push(inline);
      continue;
    }
    if (current) sections[current].push(line);
  }

  const title = cleanInline(sections["标题"].join(" ").split(/\n/)[0] || "");
  const body = sections["正文"].join("\n").trim();
  const topicText = sections["话题"].join(" ").trim();
  const imageLines = sections["配图建议"]
    .map(cleanInline)
    .filter((line) => line.length > 0 && line !== "配图建议");

  let tags = topicText
    .split(/[\s,，、;；]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));

  if (tags.length === 0) {
    tags = [...new Set(raw.match(/#[^\s#，,。；;]+/g) ?? [])];
    if (tags.length > 0) warnings.push("话题标签从全文的 # 话题中提取。");
  }

  const imageSuggestion = imageLines
    .map((line) => line.replace(/^[（(]\d+[）)]\s*/, ""))
    .filter(Boolean);

  if (!title) warnings.push("未解析到标题。");
  if (!body) warnings.push("未解析到正文。");
  if (tags.length === 0) warnings.push("未解析到话题标签。");
  if (imageSuggestion.length === 0) warnings.push("未解析到配图建议。");

  return {
    title,
    body,
    tags,
    imageSuggestion,
    raw,
    parseWarnings: warnings,
  };
}
