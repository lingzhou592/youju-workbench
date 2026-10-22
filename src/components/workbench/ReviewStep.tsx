"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ApiError,
  ConfirmationChecklist,
  DocumentVersion,
  ModelIssue,
  ReviseResponse,
  ReviewResponse,
  Run,
} from "@/lib/domain/types";
import { PROMPT_VERSION } from "@/lib/domain/types";
import { postJson } from "@/lib/api/client";
import { buildPublishText } from "@/lib/export/markdown";
import { summarizeRuleChecks } from "@/lib/review/rules";
import { mergeCitationsForBody } from "@/lib/review/citationMerge";
import {
  addConfirmation,
  addModelReview,
  createEditedVersion,
  createRevisionVersion,
  restoreVersion,
  switchCandidate,
  updateModelIssueStatus,
} from "@/lib/domain/factories";
import {
  getActiveVersion,
  getCurrentConfirmation,
  getCurrentReview,
  getCurrentRuleChecks,
  getModelReviewState,
  getVersionLabel,
  getVersionNumber,
} from "@/state/selectors";
import { useApp } from "@/state/AppStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Notice } from "@/components/ui/Notice";
import {
  IconAlert,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconEdit,
} from "@/components/ui/Icons";
import { CopyDocument } from "./CopyDocument";
import { DiffPanel } from "./DiffPanel";
import { ModelMetaLine } from "./ModelMetaLine";
import { ReviewEditor } from "./ReviewEditor";
import { ReviewRail, type ReviewTab } from "./ReviewRail";
import { RevisionPanel } from "./RevisionPanel";
import { VersionTimeline } from "./VersionTimeline";

type DiffState = {
  before: DocumentVersion;
  after: DocumentVersion;
  notes: string[];
  unresolved?: string[];
};

export function ReviewStep({
  run,
  onRunChange,
  onNext,
  onBack,
}: {
  run: Run;
  onRunChange: (run: Run) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { toast, health } = useApp();
  const [activeTab, setActiveTab] = useState<ReviewTab>("rules");
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [instruction, setInstruction] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<ApiError | null>(null);
  const [revising, setRevising] = useState(false);
  const [reviseError, setReviseError] = useState<ApiError | null>(null);
  const [editing, setEditing] = useState(false);
  const [lastDiff, setLastDiff] = useState<DiffState | null>(null);

  const version = getActiveVersion(run);
  const review = getCurrentReview(run, version);
  const ruleChecks = review?.ruleChecks ?? getCurrentRuleChecks(run, version);
  const ruleSummary = useMemo(
    () => summarizeRuleChecks(ruleChecks),
    [ruleChecks],
  );
  const confirmation = getCurrentConfirmation(run, version);
  const modelState = getModelReviewState(run, version);
  const modelIssues = review?.modelIssues ?? [];
  const openIssues = modelIssues.filter((issue) => issue.status === "open");
  const selectedIssues = openIssues.filter((issue) =>
    selectedIssueIds.includes(issue.id),
  );
  const modelReviewed = review?.modelIssues !== null && review?.modelIssues !== undefined;
  const configured = health?.configured === true;

  useEffect(() => {
    setSelectedIssueIds([]);
    setInstruction("");
    setEditing(false);
    setReviewError(null);
    setReviseError(null);
    setActiveTab("rules");
  }, [version.id]);

  const handleToggleIssue = (id: string) => {
    setSelectedIssueIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const handleSelectAllOpen = () => {
    setSelectedIssueIds(openIssues.map((issue) => issue.id));
  };

  const handleSwitchCandidate = (candidate: "A" | "B") => {
    if (candidate === version.candidate) return;
    const result = switchCandidate(run, candidate);
    if (!result.changed) return;
    onRunChange(result.run);
    toast(
      `已切换到候选 ${candidate}，并创建新版本；需要重新审核与确认。`,
      "info",
    );
  };

  const handleRunReview = async () => {
    setReviewing(true);
    setReviewError(null);
    const response = await postJson<ReviewResponse>("/api/review", {
      brief: run.input.brief,
      brand: run.input.brand,
      facts: run.input.facts,
      version,
    });

    if (!response.ok) {
      const next = addModelReview(
        run,
        version,
        null,
        response.error,
        PROMPT_VERSION,
      );
      onRunChange(next);
      setReviewError(response.error);
      toast(response.error.message, "error");
      setReviewing(false);
      return;
    }

    const next = addModelReview(
      run,
      version,
      response.data.issues,
      null,
      response.meta?.promptVersion ?? PROMPT_VERSION,
    );
    onRunChange(next);
    setReviewing(false);
    setActiveTab("model");
    toast(
      response.data.issues.length > 0
        ? `模型审核完成，提出 ${response.data.issues.length} 条问题。`
        : "模型审核完成，未提出待处理问题。",
      "success",
    );
  };

  const handleRevise = async () => {
    setRevising(true);
    setReviseError(null);
    const response = await postJson<ReviseResponse>("/api/revise", {
      brief: run.input.brief,
      brand: run.input.brand,
      facts: run.input.facts,
      version,
      issues: selectedIssues,
      instruction,
    });

    if (!response.ok) {
      setReviseError(response.error);
      setRevising(false);
      toast(response.error.message, "error");
      return;
    }

    const citations = mergeCitationsForBody(
      response.data.title,
      response.data.body,
      [...version.citations, ...response.data.citations],
    );
    const result = createRevisionVersion(run, {
      title: response.data.title,
      body: response.data.body,
      tags:
        response.data.tags.length > 0 ? response.data.tags : version.tags,
      imageSuggestion:
        response.data.imageSuggestion.length > 0
          ? response.data.imageSuggestion
          : version.imageSuggestion,
      citations,
      changeNotes:
        response.data.changeNotes.length > 0
          ? response.data.changeNotes
          : ["定向修订"],
    });

    setRevising(false);
    if (!result.changed) {
      toast("修订没有产生实质变化。", "warning");
      return;
    }
    onRunChange(result.run);
    setLastDiff({
      before: version,
      after: result.version,
      notes:
        response.data.changeNotes.length > 0
          ? response.data.changeNotes
          : ["定向修订"],
      unresolved: response.data.unresolved,
    });
    setSelectedIssueIds([]);
    setInstruction("");
    setActiveTab("rules");
    toast("已创建修订版本，规则检查已重新运行。", "success");
  };

  const handleSaveEdit = (input: {
    title: string;
    body: string;
    tags: string[];
    imageSuggestion: string[];
  }) => {
    const citations = mergeCitationsForBody(
      input.title,
      input.body,
      version.citations,
    );
    const result = createEditedVersion(run, { ...input, citations });
    if (!result.changed) {
      toast("内容没有变化，不需要创建新版本。", "info");
      setEditing(false);
      return;
    }
    onRunChange(result.run);
    setEditing(false);
    setLastDiff({
      before: version,
      after: result.version,
      notes: ["手动编辑：标题、正文、标签或配图建议"],
    });
    setActiveTab("rules");
    toast("已保存为新版本，规则检查已更新。", "success");
  };

  const handleConfirm = (
    checklist: ConfirmationChecklist,
    note: string,
    overrideReason: string,
  ) => {
    const next = addConfirmation(run, version, checklist, note, overrideReason);
    onRunChange(next);
    toast("已确认当前版本，可以导出了。", "success");
    onNext();
  };

  const handleDismissIssue = (issueId: string, reason: string) => {
    const next = updateModelIssueStatus(
      run,
      version,
      issueId,
      "dismissed",
      reason,
    );
    onRunChange(next);
    setSelectedIssueIds((current) =>
      current.filter((id) => id !== issueId),
    );
    toast("已忽略该建议，记录会保留在审核历史中。", "info");
  };

  const handleResolveIssue = (issueId: string) => {
    const next = updateModelIssueStatus(run, version, issueId, "resolved");
    onRunChange(next);
    setSelectedIssueIds((current) =>
      current.filter((id) => id !== issueId),
    );
    toast("已标记为处理。", "success");
  };

  const handleRestore = (versionId: string) => {
    const target = run.versions.find((item) => item.id === versionId);
    const result = restoreVersion(run, versionId);
    if (!result.changed) {
      toast("恢复内容与当前版本相同。", "info");
      return;
    }
    onRunChange(result.run);
    setLastDiff({
      before: version,
      after: result.version,
      notes: [
        target
          ? `恢复自版本 ${getVersionNumber(run, target)}`
          : "恢复自旧版本",
      ],
    });
    setActiveTab("rules");
    toast("已恢复为新版本，需要重新审核与确认。", "success");
  };

  return (
    <div className="step-grid step-grid-review">
      <div className="review-main">
        <section className="panel review-header">
          <div className="review-title-block">
            <span className="section-kicker">STEP 04 · 校验与修订</span>
            <h2>{version.title}</h2>
            <div className="review-meta-row">
              <Badge tone="green">候选 {version.candidate}</Badge>
              <span>{getVersionLabel(run, version)}</span>
              <span>内容指纹 {version.contentHash.slice(0, 8)}</span>
              <ModelMetaLine
                meta={run.generation.modelMeta}
                sample={run.sample}
                compact
              />
            </div>
          </div>
          <div className="review-header-actions">
            <CopyButton
              text={buildPublishText(version)}
              label="复制发布文案"
              variant="ghost"
              size="sm"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
              icon={<IconEdit size={15} />}
            >
              编辑文案
            </Button>
          </div>
        </section>

        <div className="candidate-switch-row">
          <span className="candidate-switch-label">当前候选</span>
          <div className="segmented-control">
            {run.generation.titles.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className={
                  version.candidate === candidate.id ? "segment-active" : ""
                }
                onClick={() => handleSwitchCandidate(candidate.id)}
                aria-pressed={version.candidate === candidate.id}
              >
                <strong>候选 {candidate.id}</strong>
                <span>{candidate.angle}</span>
              </button>
            ))}
          </div>
          <span className="candidate-switch-note">
            切换会创建新版本，旧审核不继承
          </span>
        </div>

        {run.sample ? (
          <Notice tone="warning" compact title="内置示例运行">
            这篇内容不是本次模型实时生成，仅用于预览流程和规则检查。你仍可编辑、运行模型审核或导出；导出物会保留“内置示例”标记。
          </Notice>
        ) : null}

        {confirmation ? (
          <Notice tone="success" compact title="已人工确认">
            当前版本已由人工确认。修改文案、切换候选或恢复旧版本都会创建新版本，需要重新确认。
          </Notice>
        ) : null}

        {ruleSummary.blocking ? (
          <Notice
            tone="warning"
            compact
            title={`${ruleSummary.fail} 项规则未通过`}
          >
            请查看右侧规则检查中的证据。你可以在人工确认时写清楚为什么仍然使用；导出物会保留这条判断。
          </Notice>
        ) : null}

        {modelState === "none" && !confirmation ? (
          <Notice tone="info" compact title="模型审核尚未运行">
            规则检查已自动完成。可以运行模型审核获取语气、事实支撑等建议；也可以直接人工确认，但需要勾选“已知晓模型审核未完成”。
          </Notice>
        ) : null}

        {modelState === "error" && review?.modelError ? (
          <Notice tone="error" compact title="模型审核未完成">
            {review.modelError.message}
            {review.modelError.hint ? ` ${review.modelError.hint}` : ""}
          </Notice>
        ) : null}

        {editing ? (
          <ReviewEditor
            key={version.id}
            version={version}
            onCancel={() => setEditing(false)}
            onSave={handleSaveEdit}
          />
        ) : (
          <CopyDocument
            title={version.title}
            body={version.body}
            tags={version.tags}
            imageSuggestion={version.imageSuggestion}
            citations={version.citations}
            facts={run.input.facts}
          />
        )}

        {lastDiff ? (
          <DiffPanel
            before={lastDiff.before}
            after={lastDiff.after}
            notes={lastDiff.notes}
            unresolved={lastDiff.unresolved}
            onClose={() => setLastDiff(null)}
          />
        ) : null}

        <RevisionPanel
          selectedIssues={selectedIssues}
          instruction={instruction}
          onInstructionChange={setInstruction}
          onClearSelection={() => setSelectedIssueIds([])}
          onRevise={() => void handleRevise()}
          revising={revising}
          error={reviseError}
          configured={configured}
          modelReviewed={modelReviewed}
        />

        <VersionTimeline
          run={run}
          currentVersionId={version.id}
          onRestore={handleRestore}
        />

        <footer className="panel review-footer">
          <Button
            variant="ghost"
            onClick={onBack}
            icon={<IconArrowLeft size={16} />}
          >
            返回生成
          </Button>
          <div className="action-row">
            {ruleSummary.blocking ? (
              <span className="review-footer-note">
                <IconAlert size={14} /> 仍有未通过项，导出会标注草稿
              </span>
            ) : null}
            <Button
              variant="primary"
              onClick={onNext}
              trailingIcon={<IconArrowRight size={16} />}
              icon={confirmation ? <IconCheck size={15} /> : undefined}
            >
              {confirmation ? "去导出定稿" : "去导出（草稿）"}
            </Button>
          </div>
        </footer>
      </div>

      <aside className="review-aside">
        <ReviewRail
          run={run}
          version={version}
          review={review}
          ruleChecks={ruleChecks}
          ruleSummary={ruleSummary}
          confirmation={confirmation}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedIssueIds={selectedIssueIds}
          onToggleIssue={handleToggleIssue}
          onSelectAllOpen={handleSelectAllOpen}
          onRunReview={() => void handleRunReview()}
          reviewing={reviewing}
          reviewError={reviewError}
          onDismissIssue={handleDismissIssue}
          onResolveIssue={handleResolveIssue}
          onConfirm={handleConfirm}
          onGoExport={onNext}
        />
      </aside>
    </div>
  );
}
