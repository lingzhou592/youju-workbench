import type {
  BrandConfig,
  Brief,
  Citation,
  EvaluationSide,
  FactCard,
  ModelMeta,
} from "@/lib/domain/types";
import { extractCitationIds } from "@/lib/review/citations";
import { checkNumericClaims } from "@/lib/review/numbers";
import { runRuleChecks } from "@/lib/review/rules";

export function buildEvaluationSide(input: {
  title: string;
  body: string;
  tags: string[];
  imageSuggestion: string[];
  citations?: Citation[];
  raw?: string;
  parseWarnings?: string[];
  brand: BrandConfig;
  brief: Brief;
  facts: FactCard[];
  latencyMs: number;
  modelMeta?: ModelMeta;
  structureComplete?: boolean;
}): EvaluationSide {
  const citations = input.citations ?? [];
  const ruleChecks = runRuleChecks({
    version: {
      title: input.title,
      body: input.body,
      tags: input.tags,
      imageSuggestion: input.imageSuggestion,
      citations,
    },
    brand: input.brand,
    brief: input.brief,
    facts: input.facts,
  });

  const passedRules = ruleChecks.filter(
    (check) => check.status === "pass",
  ).length;
  const bodyIds = extractCitationIds(input.body);
  const validIds = bodyIds.filter((id) =>
    input.facts.some((fact) => fact.id === id),
  );
  const citationValidRate =
    bodyIds.length > 0 ? validIds.length / bodyIds.length : null;

  const numeric = checkNumericClaims(input.body, input.facts);
  const unsupportedNumberCount = new Set(
    numeric.unsupported.map((item) => item.token),
  ).size;

  return {
    output: {
      title: input.title,
      body: input.body,
      tags: input.tags,
      imageSuggestion: input.imageSuggestion,
      raw: input.raw,
    },
    structureComplete:
      input.structureComplete ??
      Boolean(
        input.title.trim() &&
          input.body.trim() &&
          input.tags.length > 0 &&
          input.imageSuggestion.length > 0,
      ),
    parseWarnings: input.parseWarnings ?? [],
    ruleChecks,
    passedRules,
    totalRules: ruleChecks.length,
    citationValidRate,
    unsupportedNumberCount,
    latencyMs: Math.round(input.latencyMs),
    modelMeta: input.modelMeta,
  };
}
