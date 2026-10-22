import { describe, expect, it } from "vitest";
import { createSampleRun } from "@/lib/data/sampleRun";
import { checkNumericClaims } from "@/lib/review/numbers";
import { runRuleChecks, summarizeRuleChecks } from "@/lib/review/rules";

const sample = createSampleRun();
const validBody = `${sample.generation.body.replace(
  "\n\n周五下班后，给自己留两个小时，去山里走一走。",
  "",
)}\n\n活动安排以现场实际情况为准。`;

const validVersion = {
  title: sample.generation.titles[0].title,
  body: validBody,
  tags: sample.generation.tags,
  imageSuggestion: sample.generation.imageSuggestion,
  citations: sample.generation.citations,
};

const context = {
  version: validVersion,
  brand: sample.input.brand,
  brief: sample.input.brief,
  facts: sample.input.facts,
};

describe("runRuleChecks", () => {
  it("passes a grounded copy with all mandatory keywords", () => {
    const checks = runRuleChecks(context);
    const summary = summarizeRuleChecks(checks);
    expect(summary.fail).toBe(0);
    expect(checks.find((check) => check.id === "mandatory")?.status).toBe(
      "pass",
    );
    expect(
      checks.find((check) => check.id === "numeric-support")?.status,
    ).toBe("pass");
  });

  it("fails when a mandatory keyword is missing", () => {
    const checks = runRuleChecks({
      ...context,
      version: {
        ...validVersion,
        body: validVersion.body.replace(
          "活动安排以现场实际情况为准。",
          "",
        ),
      },
    });
    const mandatory = checks.find((check) => check.id === "mandatory");
    expect(mandatory?.status).toBe("fail");
    expect(mandatory?.evidence).toContain("实际");
  });

  it("fails on a banned phrase", () => {
    const checks = runRuleChecks({
      ...context,
      version: {
        ...validVersion,
        title: "周末必去！岳麓山夜游治愈你",
      },
    });
    expect(
      checks.find((check) => check.id === "banned-phrases")?.status,
    ).toBe("fail");
  });

  it("fails on a fabricated price", () => {
    const checks = runRuleChecks({
      ...context,
      version: {
        ...validVersion,
        body: validVersion.body.replace("39 元/人", "29 元/人"),
      },
    });
    expect(
      checks.find((check) => check.id === "numeric-support")?.status,
    ).toBe("fail");
  });

  it("fails on a citation id outside the snapshot", () => {
    const checks = runRuleChecks({
      ...context,
      version: {
        ...validVersion,
        body: `${validVersion.body} [F-999]`,
      },
    });
    expect(
      checks.find((check) => check.id === "citation-exists")?.status,
    ).toBe("fail");
  });

  it("does not flag a citation written after the sentence period", () => {
    const result = checkNumericClaims(
      "价格为 39 元/人。[F-104]",
      sample.input.facts,
    );
    expect(result.uncited).toHaveLength(0);
    expect(result.unsupported).toHaveLength(0);
  });

  it("uses paragraph citations for earlier sentences in the same paragraph", () => {
    const result = checkNumericClaims(
      "周五 18:30 集合。我们从广场出发。[F-102]",
      sample.input.facts,
    );
    expect(result.uncited).toHaveLength(0);
    expect(result.unsupported).toHaveLength(0);
  });
});
