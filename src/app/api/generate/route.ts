import {
  jsonError,
  jsonFromUnknownError,
  jsonOk,
  readJsonBody,
} from "@/lib/api/respond";
import { parseContext } from "@/lib/api/validate";
import { readLLMConfig } from "@/lib/llm/config";
import { chatCompletion } from "@/lib/llm/chat";
import { parseGenerationOutput } from "@/lib/llm/parseStructured";
import { buildGenerateMessages } from "@/lib/prompts/generate";
import { runRuleChecks } from "@/lib/review/rules";
import type { GenerateResponse } from "@/lib/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { brief, brand, facts } = parseContext(body);

    const configResult = readLLMConfig();
    if (!configResult.ok) return jsonError(configResult.error);
    const config = configResult.config;

    const prompt = buildGenerateMessages({ brand, brief, facts });
    const outcome = await chatCompletion({
      config,
      messages: prompt.messages,
      temperature: 0.65,
      maxTokens: 2600,
    });
    if (!outcome.ok) return jsonError(outcome.error);

    const meta = {
      model: outcome.data.model,
      provider: outcome.data.provider,
      latencyMs: outcome.data.latencyMs,
      usage: outcome.data.usage,
      at: new Date().toISOString(),
      source: outcome.data.source,
    };

    const parsed = parseGenerationOutput(outcome.data.content, meta);
    if (!parsed.ok) return jsonError(parsed.error);

    const generation = parsed.data;
    const ruleChecks = runRuleChecks({
      version: {
        title: generation.titles[0].title,
        body: generation.body,
        tags: generation.tags,
        imageSuggestion: generation.imageSuggestion,
        citations: generation.citations,
      },
      brand,
      brief,
      facts,
      titles: generation.titles,
    });

    const response: GenerateResponse = { generation, ruleChecks };
    return jsonOk(response, {
      model: outcome.data.model,
      latencyMs: outcome.data.latencyMs,
      usage: outcome.data.usage,
      promptVersion: prompt.promptVersion,
    });
  } catch (error) {
    return jsonFromUnknownError(error);
  }
}
