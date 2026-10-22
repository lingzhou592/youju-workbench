import { afterEach, describe, expect, it } from "vitest";
import { demoFacts } from "@/lib/data/demoFacts";
import { readLLMConfig } from "@/lib/llm/config";
import { extractJson } from "@/lib/llm/json";
import {
  parseGenerationOutput,
  parseReviewOutput,
  parseReviseOutput,
} from "@/lib/llm/parseStructured";
import type { ModelMeta } from "@/lib/domain/types";

const meta: ModelMeta = {
  model: "mock-model",
  provider: "127.0.0.1:8787",
  latencyMs: 12,
  at: "2026-10-22T00:00:00.000Z",
  source: "mock",
};

const originalEnv = { ...process.env };

afterEach(() => {
  for (const key of [
    "LLM_API_KEY",
    "LLM_BASE_URL",
    "LLM_MODEL",
    "LLM_TIMEOUT_MS",
  ]) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe("LLM config", () => {
  it("returns a missing-key error without a key", () => {
    delete process.env.LLM_API_KEY;
    const result = readLLMConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("MISSING_API_KEY");
      expect(result.error.hint).toContain(".env.local");
    }
  });

  it("reads a local OpenAI-compatible config", () => {
    process.env.LLM_API_KEY = "mock-key";
    process.env.LLM_BASE_URL = "http://127.0.0.1:8787/v1";
    process.env.LLM_MODEL = "mock-model";
    process.env.LLM_TIMEOUT_MS = "5000";
    const result = readLLMConfig();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.source).toBe("mock");
      expect(result.config.timeoutMs).toBe(5000);
      expect(result.config.baseHost).toBe("127.0.0.1:8787");
    }
  });
});

describe("structured output parsing", () => {
  it("extracts JSON from a fenced response", () => {
    const result = extractJson('```json\n{"ok":true}\n```');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ ok: true });
  });

  it("parses two title candidates and citations", () => {
    const raw = JSON.stringify({
      titles: [
        { id: "A", angle: "场景", title: "标题一", rationale: "r", hypothesis: "h" },
        { id: "B", angle: "人群", title: "标题二", rationale: "r", hypothesis: "h" },
      ],
      body: "正文 [F-101]",
      tags: ["#a", "#b", "#c"],
      imageSuggestion: ["画面一", "画面二"],
      citations: [{ factId: "F-101", quote: "原文" }],
      selfCheck: ["ok"],
    });
    const result = parseGenerationOutput(raw, meta);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.titles).toHaveLength(2);
      expect(result.data.citations[0].factId).toBe("F-101");
      expect(result.data.source).toBe("mock");
    }
  });

  it("rejects a response without two titles", () => {
    const result = parseGenerationOutput(
      JSON.stringify({ titles: [], body: "正文" }),
      meta,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("LLM_SCHEMA_ERROR");
  });

  it("clears a review quote that cannot be found in the copy", () => {
    const result = parseReviewOutput(
      JSON.stringify({
        issues: [
          {
            category: "品牌语气",
            severity: "warning",
            quote: "不存在的原文",
            problem: "语气问题",
            evidenceFactIds: ["F-101", "F-999"],
            suggestion: "改具体",
            confidence: "high",
          },
        ],
        summary: "summary",
      }),
      { facts: demoFacts, copy: "真正的原文" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.issues[0].quote).toBe("");
      expect(result.data.issues[0].confidence).toBe("low");
      expect(result.data.issues[0].evidenceFactIds).toEqual(["F-101"]);
    }
  });

  it("parses a revision response", () => {
    const result = parseReviseOutput(
      JSON.stringify({
        title: "修订标题",
        body: "修订正文 [F-101]",
        tags: ["#a"],
        imageSuggestion: ["画面"],
        citations: [{ factId: "F-101", quote: "原文" }],
        changeNotes: ["改了开头"],
        unresolved: [],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.changeNotes).toEqual(["改了开头"]);
      expect(result.data.citations).toHaveLength(1);
    }
  });
});
