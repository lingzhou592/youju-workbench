import { describe, expect, it } from "vitest";
import { demoBrand } from "@/lib/data/demoBrand";
import { demoBriefs } from "@/lib/data/demoBriefs";
import { demoFacts } from "@/lib/data/demoFacts";
import { buildEvaluationSide } from "@/lib/evaluation/metrics";

const brief = demoBriefs[0].brief;
const priceFact = demoFacts.find((fact) => fact.id === "F-104")!;

function side(body: string, citations = true) {
  return buildEvaluationSide({
    title: "周末夜游",
    body,
    tags: ["#长沙周末", "#夜游", "#大学生"],
    imageSuggestion: ["画面一", "画面二"],
    citations: citations
      ? [{ factId: "F-104", quote: "大学生凭有效学生证 39 元/人" }]
      : [],
    brand: demoBrand,
    brief,
    facts: demoFacts,
    latencyMs: 42,
  });
}

describe("evaluation metrics", () => {
  it("computes citation validity and supported numbers", () => {
    const result = side("大学生凭学生证 39 元/人。[F-104]");
    expect(result.citationValidRate).toBe(1);
    expect(result.unsupportedNumberCount).toBe(0);
    expect(result.structureComplete).toBe(true);
    expect(result.latencyMs).toBe(42);
  });

  it("returns N/A citation validity for a direct output", () => {
    const result = side("大学生凭学生证 39 元/人。", false);
    expect(result.citationValidRate).toBeNull();
    expect(result.unsupportedNumberCount).toBe(0);
  });

  it("counts unsupported fabricated numbers", () => {
    const result = side("大学生凭学生证 29 元/人。[F-104]");
    expect(result.unsupportedNumberCount).toBe(1);
  });

  it("does not treat a copy without tags or images as structurally complete", () => {
    const result = buildEvaluationSide({
      title: "标题",
      body: "正文",
      tags: [],
      imageSuggestion: [],
      citations: [],
      brand: demoBrand,
      brief,
      facts: [priceFact],
      latencyMs: 1,
    });
    expect(result.structureComplete).toBe(false);
  });
});
