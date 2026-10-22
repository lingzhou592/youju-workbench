import type {
  BrandConfig,
  DirectResponse,
  EvaluationRecord,
  FactCard,
  GenerateResponse,
  ModelMeta,
  TestCase,
} from "@/lib/domain/types";
import { postJson } from "@/lib/api/client";
import { nowIso, uid } from "@/lib/format";
import { buildEvaluationSide } from "./metrics";

export async function runComparisonCase(input: {
  testCase: TestCase;
  brand: BrandConfig;
  allFacts: FactCard[];
}): Promise<EvaluationRecord> {
  const { testCase, brand, allFacts } = input;
  if (!testCase.brief) {
    throw new Error("这条用例没有可运行的 Brief，请按说明手动执行。");
  }
  if (testCase.factIds.length === 0) {
    throw new Error("这条用例没有关联事实卡，请按说明手动执行。");
  }

  const facts = allFacts.filter((fact) =>
    testCase.factIds.includes(fact.id),
  );
  if (facts.length === 0) {
    throw new Error("用例关联的事实卡已不存在，请先恢复演示资料。");
  }
  const brief = testCase.brief;

  const directStarted = performance.now();
  const directResponse = await postJson<DirectResponse>(
    "/api/generate-direct",
    { brief, brand, facts },
  );
  const directLatency = performance.now() - directStarted;
  if (!directResponse.ok) {
    throw new Error(
      `直接提示基线失败：${directResponse.error.message}`,
    );
  }

  const workbenchStarted = performance.now();
  const workbenchResponse = await postJson<GenerateResponse>(
    "/api/generate",
    { brief, brand, facts },
  );
  const workbenchLatency = performance.now() - workbenchStarted;
  if (!workbenchResponse.ok) {
    throw new Error(
      `工作台流程失败：${workbenchResponse.error.message}`,
    );
  }

  const generation = workbenchResponse.data.generation;
  const modelMeta: ModelMeta | undefined = generation.modelMeta;
  const directMeta: ModelMeta | undefined = modelMeta
    ? {
        model: directResponse.meta?.model ?? modelMeta.model,
        provider: modelMeta.provider,
        latencyMs:
          directResponse.meta?.latencyMs ?? Math.round(directLatency),
        usage: directResponse.meta?.usage,
        at: nowIso(),
        source: modelMeta.source,
      }
    : undefined;

  const direct = buildEvaluationSide({
    title: directResponse.data.title,
    body: directResponse.data.body,
    tags: directResponse.data.tags,
    imageSuggestion: directResponse.data.imageSuggestion,
    raw: directResponse.data.raw,
    parseWarnings: directResponse.data.parseWarnings,
    brand,
    brief,
    facts,
    latencyMs: directResponse.meta?.latencyMs ?? directLatency,
    modelMeta: directMeta,
    structureComplete:
      Boolean(directResponse.data.title) &&
      Boolean(directResponse.data.body) &&
      directResponse.data.tags.length > 0 &&
      directResponse.data.imageSuggestion.length > 0,
  });

  const workbench = buildEvaluationSide({
    title: generation.titles[0].title,
    body: generation.body,
    tags: generation.tags,
    imageSuggestion: generation.imageSuggestion,
    citations: generation.citations,
    brand,
    brief,
    facts,
    latencyMs:
      workbenchResponse.meta?.latencyMs ?? workbenchLatency,
    modelMeta,
    structureComplete: true,
  });

  return {
    id: uid("eval"),
    createdAt: nowIso(),
    testCaseId: testCase.id,
    testTitle: testCase.title,
    model: modelMeta?.model ?? "unknown",
    source: modelMeta?.source === "mock" ? "mock" : "live",
    direct,
    workbench,
    human: {
      directFactual: null,
      workbenchFactual: null,
      directBrand: null,
      workbenchBrand: null,
      note: "",
    },
  };
}
