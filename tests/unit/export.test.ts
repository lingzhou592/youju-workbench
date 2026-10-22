import { describe, expect, it } from "vitest";
import type { ConfirmationChecklist } from "@/lib/domain/types";
import { createSampleRun } from "@/lib/data/sampleRun";
import { addConfirmation } from "@/lib/domain/factories";
import {
  getActiveVersion,
  getCurrentConfirmation,
  getCurrentReview,
} from "@/state/selectors";
import {
  buildPublishText,
  runToMarkdown,
} from "@/lib/export/markdown";
import { runToJson } from "@/lib/export/json";

const checklist: ConfirmationChecklist = {
  factsAccurate: true,
  toneFits: true,
  informationComplete: true,
  readyToPublish: true,
};

describe("export", () => {
  it("exports a draft with citations and a draft warning", () => {
    const run = createSampleRun();
    const version = getActiveVersion(run);
    const review = getCurrentReview(run, version);
    const markdown = runToMarkdown(run, version, review);
    expect(markdown).toContain(version.title);
    expect(markdown).toContain("## 事实依据");
    expect(markdown).toContain("## 校验记录");
    expect(markdown).toContain("未经人工确认");
  });

  it("exports a confirmed record as final", () => {
    const run = createSampleRun();
    const version = getActiveVersion(run);
    const review = getCurrentReview(run, version);
    const confirmed = addConfirmation(
      run,
      version,
      checklist,
      "已核对价格、时间和报名方式，可以发布。",
    );
    const confirmation = getCurrentConfirmation(confirmed, version);
    const markdown = runToMarkdown(
      confirmed,
      version,
      review,
      confirmation,
    );
    expect(markdown).toContain("已人工确认（定稿）");
    expect(markdown).toContain("已核对价格、时间和报名方式");
  });

  it("strips citation markers from the publish copy", () => {
    const run = createSampleRun();
    const version = getActiveVersion(run);
    const publish = buildPublishText(version);
    expect(publish).not.toContain("[F-");
    expect(publish).toContain(version.title);
  });

  it("exports JSON with a schema and the full run", () => {
    const run = createSampleRun();
    const version = getActiveVersion(run);
    const json = runToJson(run, version, getCurrentReview(run, version));
    expect(json.schemaVersion).toBe(1);
    expect(json.run.versions.length).toBeGreaterThan(0);
    expect(json.exportedVersion.title).toBe(version.title);
  });
});
