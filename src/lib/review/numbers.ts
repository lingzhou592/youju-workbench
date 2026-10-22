import type { FactCard } from "@/lib/domain/types";
import { extractCitationIds } from "./citations";

const UNIT =
  "个工作日|小时|分钟|公里|千米|周岁|元|块|折|岁|米|天|夜|日|月|年|点|场|人|组|期|个|次|晚|间|盏|条|件|份|位|名|批|周";

const NUMERIC_RE = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT})`, "g");
const PERCENT_RE = /(\d+(?:\.\d+)?)\s*%/g;
const DATE_RE = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
const TIME_RE = /(\d{1,2})\s*[:：]\s*(\d{2})/g;
const RATIO_RE = /(\d+(?:\.\d+)?)\s*\/\s*(\d+)/g;
const CN_NUM = "一二两三四五六七八九十百";
const CN_RE = new RegExp(`([${CN_NUM}]+)\\s*(${UNIT})`, "g");

type TokenMatch = {
  token: string;
  index: number;
  end: number;
};

function collectMatches(text: string): TokenMatch[] {
  const matches: TokenMatch[] = [];

  const push = (regex: RegExp, build: (groups: RegExpMatchArray) => string) => {
    for (const match of text.matchAll(regex)) {
      if (match.index === undefined) continue;
      matches.push({
        token: build(match),
        index: match.index,
        end: match.index + match[0].length,
      });
    }
  };

  push(DATE_RE, (m) => `${m[1]}月${m[2]}日`);
  push(PERCENT_RE, (m) => `${m[1]}%`);
  push(RATIO_RE, (m) => `${m[1]}/${m[2]}`);
  push(TIME_RE, (m) => `${m[1]}:${m[2]}`);
  push(NUMERIC_RE, (m) => `${m[1]}${m[2]}`);
  push(CN_RE, (m) => `${m[1]}${m[2]}`);

  matches.sort((a, b) => a.index - b.index || b.end - a.end);

  const kept: TokenMatch[] = [];
  for (const candidate of matches) {
    const overlaps = kept.some(
      (item) => candidate.index < item.end && candidate.end > item.index,
    );
    if (!overlaps) kept.push(candidate);
  }

  return kept;
}

function normalizeForSupport(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s　]+/g, "")
    .replace(/[，。！？；：、“”‘’「」『』（）()【】\[\]<>《》·—–\-_/\\|]+/g, "");
}

export function numericTokenSupported(token: string, facts: FactCard[]): boolean {
  const normalized = normalizeForSupport(token);
  if (!normalized) return true;
  return facts.some((fact) => normalizeForSupport(fact.content).includes(normalized));
}

export function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[。！？!?；;\n])/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text];
}

export type NumericFinding = {
  token: string;
  sentence: string;
};

export type NumericCheckResult = {
  unsupported: NumericFinding[];
  uncited: NumericFinding[];
  totalTokens: number;
};

/**
 * 模型常把引用写在句号之后（例如“39 元。[F-104]”）。
 * 先把紧跟句末标点的引用挪到标点前，避免它被算到下一条句子。
 */
function attachTrailingCitations(text: string): string {
  return text.replace(
    /([。！？!?；;])([ 	]*)((?:\[F-\d{3}\])+)/g,
    "$3$1",
  );
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function checkNumericClaims(
  text: string,
  facts: FactCard[],
): NumericCheckResult {
  const unsupported: NumericFinding[] = [];
  const uncited: NumericFinding[] = [];
  let totalTokens = 0;

  for (const paragraph of splitParagraphs(text)) {
    const paragraphCitationIds = extractCitationIds(paragraph);

    for (const sentence of splitSentences(attachTrailingCitations(paragraph))) {
      const sentenceCitationIds = extractCitationIds(sentence);
      const effectiveCitationIds =
        sentenceCitationIds.length > 0
          ? sentenceCitationIds
          : paragraphCitationIds;
      const clean = sentence.replace(/\s?\[F-\d{3}\]/g, "");
      const tokens = collectMatches(clean);
      totalTokens += tokens.length;
      if (tokens.length === 0) continue;

      if (effectiveCitationIds.length === 0) {
        uncited.push({
          token: tokens.map((item) => item.token).join("、"),
          sentence: sentence.slice(0, 120),
        });
        continue;
      }

      const citedFacts = facts.filter((fact) =>
        effectiveCitationIds.includes(fact.id),
      );

      for (const token of tokens) {
        if (!numericTokenSupported(token.token, citedFacts)) {
          unsupported.push({
            token: token.token,
            sentence: sentence.slice(0, 120),
          });
        }
      }
    }
  }

  return { unsupported, uncited, totalTokens };
}

