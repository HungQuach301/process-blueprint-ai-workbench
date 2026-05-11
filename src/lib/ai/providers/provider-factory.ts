import "server-only";

import { createClaudeProvider } from "@/lib/ai/providers/claude-provider";
import { createMockProvider } from "@/lib/ai/providers/mock-provider";
import { createOpenAIProvider } from "@/lib/ai/providers/openai-provider";
import { createProductAIProvider } from "@/lib/ai/providers/product-ai-provider";
import type {
  AIProviderAdapter,
  AIProviderId
} from "@/lib/ai/providers/provider-types";

export type ProviderConfigStatus = "configured" | "not configured" | "mock-only";

export function normalizeAIProviderId(value: string | undefined): AIProviderId {
  const provider = value?.trim().toLowerCase();

  if (provider === "product" || provider === "product-ai") {
    return "product-ai";
  }

  if (provider === "anthropic" || provider === "claude" || provider === "claude-byok") {
    return "claude";
  }

  if (provider === "mock" || provider === "local" || provider === "no-ai") {
    return "mock";
  }

  return "openai";
}

function firstConfiguredValue(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim()) || "";
}

function getDefaultModel() {
  return process.env.AI_MODEL || "";
}

export function getConfiguredAIProviderId() {
  return normalizeAIProviderId(
    firstConfiguredValue(process.env.AI_DEFAULT_PROVIDER, process.env.AI_PROVIDER)
  );
}

function getProductAIEndpoint() {
  return firstConfiguredValue(
    process.env.PRODUCT_AI_BASE_URL,
    process.env.PRODUCT_AI_ENDPOINT
  );
}

export function isAIProviderConfigured(providerId = getConfiguredAIProviderId()) {
  switch (providerId) {
    case "mock":
      return true;
    case "product-ai":
      return Boolean(
        getProductAIEndpoint() &&
          firstConfiguredValue(
            process.env.PRODUCT_AI_DEFAULT_MODEL,
            process.env.PRODUCT_AI_MODEL,
            getDefaultModel()
          )
      );
    case "openai":
      return Boolean(
        process.env.OPENAI_API_KEY &&
          firstConfiguredValue(
            process.env.OPENAI_DEFAULT_MODEL,
            process.env.OPENAI_MODEL,
            getDefaultModel()
          )
      );
    case "claude":
      return Boolean(
        process.env.ANTHROPIC_API_KEY &&
          firstConfiguredValue(
            process.env.CLAUDE_DEFAULT_MODEL,
            process.env.CLAUDE_MODEL,
            getDefaultModel()
          )
      );
  }
}

export function getAIProviderStatus(
  realAIEnabled: boolean,
  providerId = getConfiguredAIProviderId()
): ProviderConfigStatus {
  if (!realAIEnabled || providerId === "mock") {
    return "mock-only";
  }

  return isAIProviderConfigured(providerId) ? "configured" : "not configured";
}

export function getConfiguredAIModel(providerId = getConfiguredAIProviderId()) {
  switch (providerId) {
    case "mock":
      return process.env.MOCK_AI_MODEL || "mock-local";
    case "product-ai":
      return firstConfiguredValue(
        process.env.PRODUCT_AI_DEFAULT_MODEL,
        process.env.PRODUCT_AI_MODEL,
        getDefaultModel()
      );
    case "openai":
      return firstConfiguredValue(
        process.env.OPENAI_DEFAULT_MODEL,
        process.env.OPENAI_MODEL,
        getDefaultModel()
      );
    case "claude":
      return firstConfiguredValue(
        process.env.CLAUDE_DEFAULT_MODEL,
        process.env.CLAUDE_MODEL,
        getDefaultModel()
      );
  }
}

export function createConfiguredAIProvider(
  providerId = getConfiguredAIProviderId()
): AIProviderAdapter {
  switch (providerId) {
    case "mock":
      return createMockProvider({
        model: getConfiguredAIModel(providerId)
      });
    case "product-ai":
      return createProductAIProvider({
        endpoint: getProductAIEndpoint(),
        apiKey: process.env.PRODUCT_AI_API_KEY || "",
        model: getConfiguredAIModel(providerId)
      });
    case "openai":
      return createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY || "",
        model: getConfiguredAIModel(providerId)
      });
    case "claude":
      return createClaudeProvider({
        apiKey: process.env.ANTHROPIC_API_KEY || "",
        model: getConfiguredAIModel(providerId)
      });
  }
}
