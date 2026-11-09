export interface ModelPrice {
  promptUsdPerMillion: number;
  completionUsdPerMillion: number;
}

export const MODEL_PRICING: Record<string, ModelPrice> = {
  // OpenAI
  'gpt-4o': { promptUsdPerMillion: 2.5, completionUsdPerMillion: 10.0 },
  'gpt-4o-mini': { promptUsdPerMillion: 0.15, completionUsdPerMillion: 0.6 },
  'gpt-4-turbo': { promptUsdPerMillion: 10.0, completionUsdPerMillion: 30.0 },

  // Anthropic
  'claude-3-5-sonnet-20241022': { promptUsdPerMillion: 3.0, completionUsdPerMillion: 15.0 },
  'claude-3-5-haiku-20241022': { promptUsdPerMillion: 0.8, completionUsdPerMillion: 4.0 },
  'claude-3-opus-20240229': { promptUsdPerMillion: 15.0, completionUsdPerMillion: 75.0 },

  // Google Gemini
  'gemini-1.5-pro': { promptUsdPerMillion: 3.5, completionUsdPerMillion: 10.5 },
  'gemini-1.5-flash': { promptUsdPerMillion: 0.075, completionUsdPerMillion: 0.3 },
  'gemini-2.0-flash': { promptUsdPerMillion: 0.1, completionUsdPerMillion: 0.4 },

  // OpenRouter (defaults / aliases)
  'anthropic/claude-3.5-sonnet': { promptUsdPerMillion: 3.0, completionUsdPerMillion: 15.0 },
  'deepseek/deepseek-chat': { promptUsdPerMillion: 0.14, completionUsdPerMillion: 0.28 },
  'meta-llama/llama-3.3-70b-instruct': { promptUsdPerMillion: 0.4, completionUsdPerMillion: 0.4 },

  // Ollama (local)
  'llama3': { promptUsdPerMillion: 0, completionUsdPerMillion: 0 },
  'qwen2.5-coder': { promptUsdPerMillion: 0, completionUsdPerMillion: 0 },
  'mistral': { promptUsdPerMillion: 0, completionUsdPerMillion: 0 }
};

export class CostEstimator {
  static estimate(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const pricing = MODEL_PRICING[model] || {
      promptUsdPerMillion: 1.0,
      completionUsdPerMillion: 3.0
    };

    const promptCost = (promptTokens / 1_000_000) * pricing.promptUsdPerMillion;
    const completionCost = (completionTokens / 1_000_000) * pricing.completionUsdPerMillion;

    return Number((promptCost + completionCost).toFixed(6));
  }
}
