import { describe, expect, it } from "vitest";
import { diffStats, sentenceDiff } from "@/lib/revision/diff";

describe("sentenceDiff", () => {
  it("marks added and removed sentences", () => {
    const segments = sentenceDiff(
      "第一句。第二句。",
      "第一句。改过的第二句。第三句。",
    );
    expect(
      segments.some(
        (segment) => segment.type === "add" && segment.text.includes("第三句"),
      ),
    ).toBe(true);
    expect(
      segments.some(
        (segment) =>
          segment.type === "remove" && segment.text.includes("第二句"),
      ),
    ).toBe(true);
  });

  it("returns one same segment when nothing changed", () => {
    expect(sentenceDiff("一样。", "一样。")).toEqual([
      { type: "same", text: "一样。" },
    ]);
  });

  it("counts added and removed characters", () => {
    const stats = diffStats(sentenceDiff("旧句子。", "新句子。"));
    expect(stats.added).toBeGreaterThan(0);
    expect(stats.removed).toBeGreaterThan(0);
  });
});
