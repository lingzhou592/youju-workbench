import {
  jsonError,
  jsonFromUnknownError,
  jsonOk,
  readJsonBody,
} from "@/lib/api/respond";
import {
  parseContext,
  parseIssues,
  parseVersion,
} from "@/lib/api/validate";
import { readLLMConfig } from "@/lib/llm/config";
import { chatCompletion } from "@/lib/llm/chat";
import { parseReviseOutput } from "@/lib/llm/parseStructured";
import { buildReviseMessages } from "@/lib/prompts/revise";
import { hashContent } from "@/lib/review/hash";
import type { DocumentVersion } from "@/lib/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { brief, brand, facts } = parseContext(body);
    const version = parseVersion(body.version);
    const issues = parseIssues(body.issues);
    const instruction =
      typeof body.instruction === "string" ? body.instruction.trim() : "";

    const configResult = readLLMConfig();
    if (!configResult.ok) return jsonError(configResult.error);
    const config = configResult.config;

    const fullVersion: DocumentVersion = {
      id: "request-version",
      parentVersionId: null,
      candidate: version.candidate,
      title: version.title,
      body: version.body,
      tags: version.tags,
      imageSuggestion: version.imageSuggestion,
      citations: version.citations,
      contentHash: hashContent(version),
      source: "manual-edit",
      createdAt: new Date().toISOString(),
    };

    const prompt = buildReviseMessages({
      brand,
      brief,
      facts,
      version: fullVersion,
      issues,
      instruction,
    });
    const outcome = await chatCompletion({
      config,
      messages: prompt.messages,
      temperature: 0.35,
      maxTokens: 2600,
    });
    if (!outcome.ok) return jsonError(outcome.error);

    const parsed = parseReviseOutput(outcome.data.content);
    if (!parsed.ok) return jsonError(parsed.error);

    return jsonOk(parsed.data, {
      model: outcome.data.model,
      latencyMs: outcome.data.latencyMs,
      usage: outcome.data.usage,
      promptVersion: prompt.promptVersion,
    });
  } catch (error) {
    return jsonFromUnknownError(error);
  }
}
