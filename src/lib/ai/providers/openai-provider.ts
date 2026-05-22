import {
  buildDefaultMessages,
  createRequestId,
  parseJsonIfPossible,
  type AIModelRequest,
  type AIProviderAdapter,
  type AIProviderResponse
} from "@/lib/ai/providers/provider-types";
import { DRAFT_PTR_OUTPUT_SCHEMA } from "@/lib/ai/output-schemas/draft-ptr-output-schema";
import { adaptProviderResponse } from "@/lib/ai/providers/response-adapter";

type OpenAIProviderOptions = {
  apiKey: string;
  model: string;
};

const INPUT_BRIEF_TO_PTR_SKILL_ID = "input-brief-to-ptr";
const DRAFT_PTR_SCHEMA_NAME = "draft_process_task_register";

export function createOpenAIProvider(
  options: OpenAIProviderOptions
): AIProviderAdapter {
  return {
    providerId: "openai",
    async run(request: AIModelRequest): Promise<AIProviderResponse> {
      if (!options.apiKey) {
        throw new Error("OPENAI_API_KEY is required when OpenAI is enabled.");
      }

      const model = request.model || options.model;

      if (!model) {
        throw new Error("AI_MODEL or OPENAI_MODEL is required when OpenAI is enabled.");
      }

      const requestId = request.requestId ?? createRequestId("openai");
      const startedAt = Date.now();
      const useStructuredOutput =
        request.skillId === INPUT_BRIEF_TO_PTR_SKILL_ID &&
        request.supportsStructuredOutput === true;
      const requestBody = {
        model,
        input: buildDefaultMessages(request),
        ...(useStructuredOutput
          ? {
              text: {
                format: {
                  type: "json_schema",
                  name: DRAFT_PTR_SCHEMA_NAME,
                  schema: DRAFT_PTR_OUTPUT_SCHEMA,
                  strict: true
                }
              }
            }
          : {})
      };

      if (useStructuredOutput) {
        console.log(
          JSON.stringify({
            event: "structured_output_mode",
            skillId: request.skillId,
            provider: "openai",
            mode: "json_schema",
            schemaName: DRAFT_PTR_SCHEMA_NAME
          })
        );
      }

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}.`);
      }

      const rawJson = await response.json();
      const adapted = adaptProviderResponse(rawJson, "openai-responses");
      const rawText = adapted.content;

      return {
        rawText,
        rawJson,
        parsedJson: parseJsonIfPossible(rawText),
        providerId: "openai",
        model: adapted.model === "unknown" ? model : adapted.model,
        requestId,
        tokenUsage: {
          inputTokens: adapted.inputTokens,
          outputTokens: adapted.outputTokens,
          totalTokens: adapted.totalTokens
        },
        latencyMs: Date.now() - startedAt,
        warnings: rawText ? [] : ["OpenAI response did not include output_text."],
        externalApiCalled: true
      };
    }
  };
}

export type { AIModelRequest, AIProviderResponse };
