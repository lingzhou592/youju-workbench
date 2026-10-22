import type {
  ConfirmationChecklist,
  ConfirmationRecord,
  DocumentVersion,
  ReviewRecord,
  RuleCheck,
  Run,
} from "@/lib/domain/types";
import { runRuleChecks, summarizeRuleChecks } from "@/lib/review/rules";

export function getActiveVersion(run: Run): DocumentVersion {
  return (
    run.versions.find((version) => version.id === run.activeVersionId) ??
    run.versions[run.versions.length - 1]
  );
}

export function getVersionById(
  run: Run,
  versionId: string,
): DocumentVersion | undefined {
  return run.versions.find((version) => version.id === versionId);
}

export function getCurrentReview(
  run: Run,
  version: DocumentVersion = getActiveVersion(run),
): ReviewRecord | undefined {
  return [...run.reviews]
    .reverse()
    .find(
      (review) =>
        review.versionId === version.id &&
        review.contentHash === version.contentHash,
    );
}

export function getCurrentConfirmation(
  run: Run,
  version: DocumentVersion = getActiveVersion(run),
): ConfirmationRecord | undefined {
  return [...run.confirmations]
    .reverse()
    .find(
      (confirmation) =>
        confirmation.versionId === version.id &&
        confirmation.contentHash === version.contentHash,
    );
}

export function getCurrentRuleChecks(
  run: Run,
  version: DocumentVersion = getActiveVersion(run),
): RuleCheck[] {
  const review = getCurrentReview(run, version);
  if (review) return review.ruleChecks;
  return runRuleChecks({
    version,
    brand: run.input.brand,
    brief: run.input.brief,
    facts: run.input.facts,
  });
}

export function getRuleSummary(
  run: Run,
  version: DocumentVersion = getActiveVersion(run),
) {
  return summarizeRuleChecks(getCurrentRuleChecks(run, version));
}

export type RunStatus =
  | "sample"
  | "confirmed"
  | "reviewed"
  | "generated"
  | "draft";

export function getRunStatus(run: Run): RunStatus {
  if (!run.versions || run.versions.length === 0) return "draft";
  const version = getActiveVersion(run);
  if (getCurrentConfirmation(run, version)) return "confirmed";
  if (run.sample) return "sample";
  const review = getCurrentReview(run, version);
  if (review && review.modelIssues !== null) return "reviewed";
  return "generated";
}

export function getRunStatusLabel(run: Run): string {
  const status = getRunStatus(run);
  switch (status) {
    case "sample":
      return "内置示例";
    case "confirmed":
      return "已确认";
    case "reviewed":
      return "已模型审核";
    case "generated":
      return "待审核";
    default:
      return "草稿";
  }
}

export function getLatestVersionForCandidate(
  run: Run,
  candidate: "A" | "B",
): DocumentVersion | undefined {
  return [...run.versions]
    .reverse()
    .find((version) => version.candidate === candidate);
}

export function getVersionNumber(run: Run, version: DocumentVersion): number {
  return run.versions.findIndex((item) => item.id === version.id) + 1;
}

export function getVersionSourceLabel(version: DocumentVersion): string {
  switch (version.source) {
    case "generation":
      return "初稿";
    case "candidate-switch":
      return "切换候选";
    case "manual-edit":
      return "手动编辑";
    case "revision":
      return "定向修订";
    case "restore":
      return "恢复版本";
    default:
      return "版本";
  }
}

export function getVersionLabel(run: Run, version: DocumentVersion): string {
  return `候选 ${version.candidate} · ${getVersionSourceLabel(version)} · v${getVersionNumber(run, version)}`;
}

export function getModelReviewState(
  run: Run,
  version: DocumentVersion = getActiveVersion(run),
): "none" | "ok" | "error" {
  const review = getCurrentReview(run, version);
  if (!review) return "none";
  if (review.modelIssues !== null) return "ok";
  if (review.modelError) return "error";
  return "none";
}

export function countModelIssues(run: Run, version?: DocumentVersion) {
  const review = getCurrentReview(run, version);
  const issues = review?.modelIssues ?? [];
  return {
    total: issues.length,
    open: issues.filter((issue) => issue.status === "open").length,
    error: issues.filter(
      (issue) => issue.status === "open" && issue.severity === "error",
    ).length,
    warning: issues.filter(
      (issue) => issue.status === "open" && issue.severity === "warning",
    ).length,
    info: issues.filter(
      (issue) => issue.status === "open" && issue.severity === "info",
    ).length,
  };
}

export function canConfirm(input: {
  checklist: ConfirmationChecklist;
  note: string;
  ruleSummary: ReturnType<typeof summarizeRuleChecks>;
  overrideReason: string;
  modelReviewed: boolean;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const allChecked =
    input.checklist.factsAccurate &&
    input.checklist.toneFits &&
    input.checklist.informationComplete &&
    input.checklist.readyToPublish;
  if (!allChecked) reasons.push("四项人工确认清单需要全部勾选。");
  if (input.note.trim().length < 10) reasons.push("确认备注至少写 10 个字，记录判断依据。");
  if (input.ruleSummary.blocking && input.overrideReason.trim().length < 10) {
    reasons.push("仍有规则未通过，需要填写至少 10 个字的确认理由。");
  }
  if (!input.modelReviewed && !input.checklist.modelAcknowledged) {
    reasons.push("模型审核尚未完成，请勾选已知晓并继续人工判断。");
  }
  return { ok: reasons.length === 0, reasons };
}
