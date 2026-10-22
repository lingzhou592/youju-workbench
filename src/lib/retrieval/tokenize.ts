const CJK = /[㐀-鿿]/;
const CJK_RUN = /[㐀-鿿]+/g;
const LATIN = /[a-zA-Z][a-zA-Z0-9_-]+/g;

const STOP_TERMS = new Set([
  "一个",
  "一些",
  "这个",
  "那个",
  "这些",
  "那些",
  "我们",
  "你们",
  "他们",
  "可以",
  "需要",
  "进行",
  "以及",
  "或者",
  "不是",
  "就是",
  "什么",
  "怎么",
  "如果",
  "因为",
  "所以",
  "但是",
  "还是",
  "已经",
  "自己",
  "时候",
  "现在",
  "然后",
  "比较",
  "非常",
  "通过",
  "关于",
  "对于",
  "而且",
  "并且",
  "其中",
  "这样",
  "那样",
  "一下",
  "一点",
  "有点",
  "还有",
  "没有",
  "不会",
  "不能",
  "不要",
  "想要",
  "希望",
  "适合",
  "提供",
  "包括",
  "包含",
]);

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s　]+/g, "")
    .replace(/[，。！？；：、“”‘’「」『』（）()【】\[\]<>《》·—–\-_/\\|]+/g, "");
}

export function isCjk(value: string): boolean {
  return CJK.test(value);
}

/**
 * 中文二元组 + 英文词。刻意保持透明：不依赖向量或外部分词服务。
 */
export function tokenize(query: string): string[] {
  const normalized = query.toLowerCase();
  const terms = new Set<string>();

  for (const match of normalized.matchAll(CJK_RUN)) {
    const run = match[0];
    if (run.length === 1) {
      terms.add(run);
      continue;
    }
    if (run.length <= 6) terms.add(run);
    for (let i = 0; i < run.length - 1; i += 1) {
      const bigram = run.slice(i, i + 2);
      if (!STOP_TERMS.has(bigram)) terms.add(bigram);
    }
  }

  for (const match of normalized.matchAll(LATIN)) {
    if (match[0].length >= 2) terms.add(match[0]);
  }

  return [...terms].filter((term) => term.length > 0);
}

export function termsFromBriefFields(fields: Array<string | undefined>): string[] {
  const text = fields.filter(Boolean).join("\n");
  return tokenize(text);
}
