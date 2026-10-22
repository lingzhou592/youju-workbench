import { describe, expect, it } from "vitest";
import { demoBriefs } from "@/lib/data/demoBriefs";
import { demoFacts } from "@/lib/data/demoFacts";
import { rankFacts, searchFacts } from "@/lib/retrieval/rank";
import { tokenize } from "@/lib/retrieval/tokenize";

describe("keyword retrieval", () => {
  it("extracts Chinese bigrams", () => {
    const terms = tokenize("岳麓山夜游");
    expect(terms).toContain("岳麓");
    expect(terms).toContain("麓山");
    expect(terms).toContain("夜游");
  });

  it("ranks night-walk facts above pottery facts for the night brief", () => {
    const ranked = rankFacts(demoFacts, demoBriefs[0].brief);
    const topIds = ranked.slice(0, 8).map((item) => item.fact.id);
    expect(topIds).toContain("F-101");
    expect(topIds).toContain("F-102");
    const night = ranked.find((item) => item.fact.id === "F-101");
    const pottery = ranked.find((item) => item.fact.id === "F-201");
    expect(night?.score ?? 0).toBeGreaterThan(pottery?.score ?? 0);
  });

  it("searches title, content and tags", () => {
    const results = searchFacts(demoFacts, "陶艺");
    expect(results.some((fact) => fact.id === "F-201")).toBe(true);
  });

  it("demotes archived facts", () => {
    const ranked = rankFacts(demoFacts, demoBriefs[0].brief);
    const current = ranked.find((item) => item.fact.id === "F-104");
    const archived = ranked.find((item) => item.fact.id === "F-112");
    expect(current?.fact.status).toBe("active");
    expect(archived?.fact.status).toBe("archived");
  });
});
