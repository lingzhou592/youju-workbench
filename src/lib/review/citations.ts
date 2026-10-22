import type { Citation, FactCard } from "@/lib/domain/types";

const CITATION_PATTERN = /\[F-(\d{3})\]/g;

export function normalizeCitationMarkers(text: string): string {
  return text.replace(/【(F-\d{3})】/g, "[$1]");
}

export function extractCitationIds(text: string): string[] {
  const normalized = normalizeCitationMarkers(text);
  const ids = new Set<string>();
  for (const match of normalized.matchAll(CITATION_PATTERN)) {
    ids.add(`F-${match[1]}`);
  }
  return [...ids];
}

export function stripCitations(text: string): string {
  return normalizeCitationMarkers(text)
    .replace(/\s?\[F-\d{3}\]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeForQuote(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s　]+/g, "")
    .replace(/[……]+|\.{3,}/g, "")
    .replace(/[，。！？；：、“”‘’「」『』（）()【】\[\]<>《》·—–\-_/\\|]+/g, "");
}

export function quoteInFact(quote: string, factContent: string): boolean {
  const parts = quote
    .split(/……|\.{3,}/)
    .map((part) => normalizeForQuote(part))
    .filter((part) => part.length >= 2);

  if (parts.length === 0) return false;
  const normalizedFact = normalizeForQuote(factContent);
  return parts.every((part) => normalizedFact.includes(part));
}

export function resolveCitation(
  citation: Citation,
  facts: FactCard[],
): FactCard | undefined {
  return facts.find((fact) => fact.id === citation.factId);
}

export function citationLabel(factId: string): string {
  return factId.replace("F-", "");
}
