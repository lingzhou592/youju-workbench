import { describe, expect, it } from "vitest";
import {
  FACT_IMPORT_TEMPLATE,
  parseFactInput,
} from "@/lib/domain/factImport";

describe("fact import", () => {
  it("parses a JSON fact array", () => {
    const result = parseFactInput(
      JSON.stringify([
        {
          id: "F-401",
          title: "测试事实",
          content: "这是一段可核对的事实。",
          category: "产品信息",
          sourceName: "测试来源",
          sourceType: "模拟资料",
          tags: ["测试"],
          status: "active",
        },
      ]),
    );
    expect(result.errors).toHaveLength(0);
    expect(result.facts).toHaveLength(1);
    expect(result.facts[0].id).toBe("F-401");
    expect(result.facts[0].tags).toEqual(["测试"]);
  });

  it("parses the text template with two cards", () => {
    const result = parseFactInput(FACT_IMPORT_TEMPLATE);
    expect(result.errors).toHaveLength(0);
    expect(result.facts).toHaveLength(2);
    expect(result.facts[0].id).toBe("F-401");
    expect(result.facts[1].id).toBe("F-402");
  });

  it("reports an invalid category", () => {
    const result = parseFactInput(
      JSON.stringify([
        {
          id: "F-401",
          title: "测试",
          content: "内容",
          category: "不存在的分类",
          sourceName: "来源",
        },
      ]),
    );
    expect(result.facts).toHaveLength(0);
    expect(result.errors.join(" ")).toContain("分类");
  });
});
