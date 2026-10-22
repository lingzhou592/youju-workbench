import {
  jsonError,
  jsonFromUnknownError,
  jsonOk,
  readJsonBody,
} from "@/lib/api/respond";
import { parseContext } from "@/lib/api/validate";
import { readLLMConfig } from "@/lib/llm/config";
import { chatCompletion } from "@/lib/llm/chat";
import { parseDirectOutput } from "@/lib/llm/parseDirect";
import { buildDirectMessages } from "@/lib/prompts/direct";
import type { DirectResponse } from "@/lib/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { brief, brand, facts } = parseContext(body);

    const configResult = readLLMConfig();
    if (!configResult.ok) return jsonError(configResult.error);
    const config = configResult.config;

    const prompt = buildDirectMessages({ brand, brief, facts });
    const outcome = await chatCompletion({
      config,
      messages: prompt.messages,
      temperature: 0.65,
      maxTokens: 1800,
    });
    if (!outcome.ok) return jsonError(outcome.error);

    const parsed = parseDirectOutput(outcome.data.content);
    const data: DirectResponse = parsed;

    return jsonOk(data, {
      model: outcome.data.model,
      latencyMs: outcome.data.latencyMs,
      usage: outcome.data.usage,
      promptVersion: prompt.promptVersion,
    });
  } catch (error) {
    return jsonFromUnknownError(error);
  }
}
