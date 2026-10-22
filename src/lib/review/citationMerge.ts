import type { Citation } from "@/lib/domain/types";
import { extractCitationIds } from "./citations";

/**
 * 重新解析正文中的引用编号，并尽量保留已有的原文摘录。
 * 新增但没有摘录的编号会以空 quote 保留，交由规则检查提醒补全。
 */
export function mergeCitationsForBody(
  title: string,
  body: string,
  current: Citation[],
): Citation[] {
  const ids = extractCitationIds(`${title}\n${body}`);
  const map = new Map(current.map((citation) => [citation.factId, citation]));
  return ids.map(
    (factId) => map.get(factId) ?? { factId, quote: "" },
  );
}
