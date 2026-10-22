import { describe, expect, it } from "vitest";
import type { ConfirmationChecklist, ModelIssue } from "@/lib/domain/types";
import {
  addConfirmation,
  addModelReview,
  appendVersion,
  createEditedVersion,
  latestVersionForCandidate,
  restoreVersion,
  switchCandidate,
  updateModelIssueStatus,
} from "@/lib/domain/factories";
import { createSampleRun } from "@/lib/data/sampleRun";
import {
  getActiveVersion,
  getCurrentConfirmation,
  getCurrentReview,
} from "@/state/selectors";

const checklist: ConfirmationChecklist = {
  factsAccurate: true,
  toneFits: true,
  informationComplete: true,
  readyToPublish: true,
};

describe("run version factories", () => {
  it("creates a run with one version and one rule review", () => {
    const run = createSampleRun();
    expect(run.versions).toHaveLength(1);
    expect(run.reviews).toHaveLength(1);
    expect(getActiveVersion(run).candidate).toBe("A");
    expect(getCurrentReview(run)?.modelIssues).toBeNull();
  });

  it("appends a new version and re-runs rules on edit", () => {
    const run = createSampleRun();
    const current = getActiveVersion(run);
    const edited = createEditedVersion(run, {
      title: current.title,
      body: `${current.body}\n\n新增一句。`,
      tags: current.tags,
      imageSuggestion: current.imageSuggestion,
      citations: current.citations,
    });
    expect(edited.changed).toBe(true);
    expect(edited.run.versions).toHaveLength(2);
    expect(getActiveVersion(edited.run).id).toBe(edited.version.id);
    expect(getCurrentReview(edited.run)?.versionId).toBe(edited.version.id);
    expect(getCurrentReview(edited.run)?.modelIssues).toBeNull();
  });

  it("does not create a version for identical content", () => {
    const run = createSampleRun();
    const current = getActiveVersion(run);
    const result = appendVersion(run, {
      candidate: current.candidate,
      title: current.title,
      body: current.body,
      tags: current.tags,
      imageSuggestion: current.imageSuggestion,
      citations: current.citations,
      source: "manual-edit",
    });
    expect(result.changed).toBe(false);
    expect(result.run.versions).toHaveLength(1);
  });

  it("does not carry a confirmation onto a new version", () => {
    const run = createSampleRun();
    const current = getActiveVersion(run);
    const confirmed = addConfirmation(
      run,
      current,
      checklist,
      "已核对价格、时间和报名方式，内容可以发布。",
    );
    expect(getCurrentConfirmation(confirmed)).toBeDefined();

    const edited = createEditedVersion(confirmed, {
      title: current.title,
      body: `${current.body}\n\n再改一句。`,
      tags: current.tags,
      imageSuggestion: current.imageSuggestion,
      citations: current.citations,
    });
    expect(edited.changed).toBe(true);
    expect(getCurrentConfirmation(edited.run)).toBeUndefined();
  });

  it("switches title candidates while preserving the other candidate", () => {
    const run = createSampleRun();
    const switched = switchCandidate(run, "B");
    expect(switched.changed).toBe(true);
    expect(getActiveVersion(switched.run).candidate).toBe("B");
    expect(latestVersionForCandidate(switched.run, "A")).toBeDefined();
    expect(getCurrentReview(switched.run)?.modelIssues).toBeNull();
  });

  it("restores an old version as a new version", () => {
    const run = createSampleRun();
    const first = getActiveVersion(run);
    const edited = createEditedVersion(run, {
      title: first.title,
      body: `${first.body}\n\n临时修改。`,
      tags: first.tags,
      imageSuggestion: first.imageSuggestion,
      citations: first.citations,
    });
    const restored = restoreVersion(edited.run, first.id);
    expect(restored.changed).toBe(true);
    expect(restored.version.source).toBe("restore");
    expect(restored.version.body).toBe(first.body);
    expect(getCurrentConfirmation(restored.run)).toBeUndefined();
  });

  it("keeps model issue state changes in a new review record", () => {
    const run = createSampleRun();
    const version = getActiveVersion(run);
    const issue: ModelIssue = {
      id: "issue-1",
      category: "品牌语气",
      severity: "warning",
      quote: "周五 18:30",
      problem: "开头可以更具体",
      evidenceFactIds: ["F-102"],
      suggestion: "改成具体动作",
      confidence: "medium",
      status: "open",
    };
    const reviewed = addModelReview(run, version, [issue], null, "test");
    const updated = updateModelIssueStatus(
      reviewed,
      version,
      "issue-1",
      "resolved",
    );
    const current = getCurrentReview(updated, version);
    expect(current?.modelIssues?.[0].status).toBe("resolved");
    expect(reviewed.reviews.length).toBeLessThan(updated.reviews.length);
  });
});
