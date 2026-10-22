import {
  PROMPT_VERSION,
  RULE_VERSION,
  type BrandConfig,
  type Brief,
  type Citation,
  type ConfirmationChecklist,
  type DocumentVersion,
  type FactCard,
  type GenerationResult,
  type ModelIssue,
  type ReviewRecord,
  type Run,
} from "@/lib/domain/types";
import { nowIso, uid } from "@/lib/format";
import { hashContent } from "@/lib/review/hash";
import { runRuleChecks } from "@/lib/review/rules";

type VersionInput = {
  candidate: "A" | "B";
  title: string;
  body: string;
  tags: string[];
  imageSuggestion: string[];
  citations: Citation[];
  source: DocumentVersion["source"];
  parentVersionId: string | null;
  revisionNotes?: string[];
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function makeVersion(input: VersionInput): DocumentVersion {
  const normalized = {
    title: input.title.trim(),
    body: input.body.trim(),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    imageSuggestion: input.imageSuggestion
      .map((item) => item.trim())
      .filter(Boolean),
  };
  return {
    id: uid("ver"),
    parentVersionId: input.parentVersionId,
    candidate: input.candidate,
    title: normalized.title,
    body: normalized.body,
    tags: normalized.tags,
    imageSuggestion: normalized.imageSuggestion,
    citations: clone(input.citations),
    contentHash: hashContent(normalized),
    source: input.source,
    revisionNotes: input.revisionNotes,
    createdAt: nowIso(),
  };
}

function makeRuleReview(
  version: DocumentVersion,
  run: Pick<Run, "input">,
): ReviewRecord {
  const ruleChecks = runRuleChecks({
    version,
    brand: run.input.brand,
    brief: run.input.brief,
    facts: run.input.facts,
  });
  return {
    id: uid("review"),
    versionId: version.id,
    contentHash: version.contentHash,
    ruleChecks,
    modelIssues: null,
    modelError: null,
    ruleVersion: RULE_VERSION,
    promptVersion: PROMPT_VERSION,
    createdAt: nowIso(),
  };
}

export function makeRun(input: {
  brief: Brief;
  brand: BrandConfig;
  facts: FactCard[];
  generation: GenerationResult;
  candidate: "A" | "B";
}): Run {
  const title =
    input.brief.campaignName.trim() ||
    input.brief.product.trim() ||
    "未命名活动";
  const selectedTitle =
    input.generation.titles.find((item) => item.id === input.candidate) ??
    input.generation.titles[0];

  const run: Run = {
    id: uid("run"),
    title,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    input: {
      brief: clone(input.brief),
      brand: clone(input.brand),
      facts: clone(input.facts),
    },
    generation: clone(input.generation),
    versions: [],
    activeVersionId: "",
    reviews: [],
    confirmations: [],
    sample: input.generation.source === "sample" ? true : undefined,
  };

  const version = makeVersion({
    candidate: input.candidate,
    title: selectedTitle.title,
    body: input.generation.body,
    tags: input.generation.tags,
    imageSuggestion: input.generation.imageSuggestion,
    citations: input.generation.citations,
    source: "generation",
    parentVersionId: null,
    revisionNotes: ["由生成结果创建"],
  });

  run.versions = [version];
  run.activeVersionId = version.id;
  run.reviews = [makeRuleReview(version, run)];
  return run;
}

export function activeVersionOf(run: Run): DocumentVersion {
  return (
    run.versions.find((version) => version.id === run.activeVersionId) ??
    run.versions[run.versions.length - 1]
  );
}

export function latestVersionForCandidate(
  run: Run,
  candidate: "A" | "B",
): DocumentVersion | undefined {
  return [...run.versions]
    .reverse()
    .find((version) => version.candidate === candidate);
}

export function appendVersion(
  run: Run,
  input: Omit<VersionInput, "parentVersionId">,
): { run: Run; version: DocumentVersion; changed: boolean } {
  const active = activeVersionOf(run);
  const version = makeVersion({
    ...input,
    parentVersionId: active.id,
  });

  if (
    version.contentHash === active.contentHash &&
    input.source !== "candidate-switch"
  ) {
    return { run, version: active, changed: false };
  }

  const review = makeRuleReview(version, run);
  const nextRun: Run = {
    ...run,
    versions: [...run.versions, version],
    activeVersionId: version.id,
    reviews: [...run.reviews, review],
    updatedAt: nowIso(),
  };
  return { run: nextRun, version, changed: true };
}

export function switchCandidate(
  run: Run,
  candidate: "A" | "B",
): { run: Run; version: DocumentVersion; changed: boolean } {
  const active = activeVersionOf(run);
  if (active.candidate === candidate) {
    return { run, version: active, changed: false };
  }

  const existing = latestVersionForCandidate(run, candidate);
  const generationTitle =
    run.generation.titles.find((item) => item.id === candidate) ??
    run.generation.titles[0];

  const source = existing ?? {
    title: generationTitle.title,
    body: run.generation.body,
    tags: run.generation.tags,
    imageSuggestion: run.generation.imageSuggestion,
    citations: run.generation.citations,
  };

  return appendVersion(run, {
    candidate,
    title: source.title,
    body: source.body,
    tags: source.tags,
    imageSuggestion: source.imageSuggestion,
    citations: source.citations,
    source: "candidate-switch",
    revisionNotes: [`从候选 ${active.candidate} 切换到 ${candidate}`],
  });
}

export function createEditedVersion(
  run: Run,
  input: {
    title: string;
    body: string;
    tags: string[];
    imageSuggestion: string[];
    citations: Citation[];
  },
): { run: Run; version: DocumentVersion; changed: boolean } {
  const active = activeVersionOf(run);
  return appendVersion(run, {
    candidate: active.candidate,
    title: input.title,
    body: input.body,
    tags: input.tags,
    imageSuggestion: input.imageSuggestion,
    citations: input.citations,
    source: "manual-edit",
    revisionNotes: ["手动编辑"],
  });
}

export function createRevisionVersion(
  run: Run,
  input: {
    title: string;
    body: string;
    tags: string[];
    imageSuggestion: string[];
    citations: Citation[];
    changeNotes: string[];
  },
): { run: Run; version: DocumentVersion; changed: boolean } {
  const active = activeVersionOf(run);
  return appendVersion(run, {
    candidate: active.candidate,
    title: input.title,
    body: input.body,
    tags: input.tags,
    imageSuggestion: input.imageSuggestion,
    citations: input.citations,
    source: "revision",
    revisionNotes:
      input.changeNotes.length > 0 ? input.changeNotes : ["定向修订"],
  });
}

export function restoreVersion(
  run: Run,
  versionId: string,
): { run: Run; version: DocumentVersion; changed: boolean } {
  const source = run.versions.find((version) => version.id === versionId);
  if (!source) {
    return { run, version: activeVersionOf(run), changed: false };
  }
  const index = run.versions.findIndex((version) => version.id === versionId);
  return appendVersion(run, {
    candidate: source.candidate,
    title: source.title,
    body: source.body,
    tags: source.tags,
    imageSuggestion: source.imageSuggestion,
    citations: source.citations,
    source: "restore",
    revisionNotes: [`恢复自版本 ${index + 1}`],
  });
}

export function addModelReview(
  run: Run,
  version: DocumentVersion,
  issues: ModelIssue[] | null,
  error: ReviewRecord["modelError"],
  promptVersion: string,
): Run {
  const ruleChecks = runRuleChecks({
    version,
    brand: run.input.brand,
    brief: run.input.brief,
    facts: run.input.facts,
  });
  const review: ReviewRecord = {
    id: uid("review"),
    versionId: version.id,
    contentHash: version.contentHash,
    ruleChecks,
    modelIssues: issues,
    modelError: error ?? null,
    ruleVersion: RULE_VERSION,
    promptVersion,
    createdAt: nowIso(),
  };
  return {
    ...run,
    reviews: [...run.reviews, review],
    updatedAt: nowIso(),
  };
}

export function addConfirmation(
  run: Run,
  version: DocumentVersion,
  checklist: ConfirmationChecklist,
  note: string,
  overrideReason?: string,
): Run {
  return {
    ...run,
    confirmations: [
      ...run.confirmations,
      {
        id: uid("confirm"),
        versionId: version.id,
        contentHash: version.contentHash,
        checklist,
        note,
        overrideReason,
        createdAt: nowIso(),
      },
    ],
    updatedAt: nowIso(),
  };
}

export function updateModelIssueStatus(
  run: Run,
  version: DocumentVersion,
  issueId: string,
  status: ModelIssue["status"],
  reason?: string,
): Run {
  const current = [...run.reviews]
    .reverse()
    .find(
      (review) =>
        review.versionId === version.id &&
        review.contentHash === version.contentHash,
    );
  if (!current || !current.modelIssues) return run;

  const issues = current.modelIssues.map((issue) =>
    issue.id === issueId
      ? {
          ...issue,
          status,
          dismissReason:
            status === "dismissed" ? reason?.trim() || "人工忽略" : undefined,
        }
      : issue,
  );

  return {
    ...run,
    reviews: [
      ...run.reviews,
      {
        ...current,
        id: uid("review"),
        modelIssues: issues,
        createdAt: nowIso(),
      },
    ],
    updatedAt: nowIso(),
  };
}
