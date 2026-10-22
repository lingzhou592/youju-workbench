export const ABSOLUTE_PHRASES = [
  "最好",
  "最佳",
  "最强",
  "最大",
  "最高级",
  "最优",
  "唯一",
  "首个",
  "首家",
  "独家",
  "永久",
  "彻底",
  "百分百",
  "万能",
  "无敌",
  "史无前例",
  "前所未有",
  "绝对",
];

export function findAbsolutePhrases(normalizedText: string): string[] {
  return ABSOLUTE_PHRASES.filter((phrase) =>
    normalizedText.includes(phrase.toLowerCase().replace(/\s+/g, "")),
  );
}
