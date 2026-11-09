import type { z } from 'zod';
import type { CredentialStore } from '@nimo-deck/core';
import type {
  AIProviderAdapter,
  CompletionOptions,
  CompletionResult,
  ProviderCapabilities,
  StructuredResult
} from './types.js';
import { CostEstimator } from './cost-estimator.js';

export interface OpenRouterConfig {
  apiKey?: string;
  defaultModel?: string;
  baseUrl?: string;
  credentialStore?: CredentialStore;
  fetchFn?: typeof fetch;
}

export class OpenRouterAdapter implements AIProviderAdapter {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter Gateway';

  private apiKey?: string;
  private defaultModel: string;
  private baseUrl: string;
  private credentialStore?: CredentialStore;
  private fetchFn: typeof fetch;

  constructor(config: OpenRouterConfig = {}) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'anthropic/claude-3.5-sonnet';
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.credentialStore = config.credentialStore;
    this.fetchFn = config.fetchFn || globalThis.fetch;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      jsonMode: true,
      maxContextTokens: 128000,
      supportedModels: [
        'anthropic/claude-3.5-sonnet',
        'deepseek/deepseek-chat',
        'meta-llama/llama-3.3-70b-instruct'
      ]
    };
  }

  private async getResolvedApiKey(): Promise<string> {
    if (this.apiKey) return this.apiKey;
    if (this.credentialStore) {
      const stored = await this.credentialStore.getPassword('nimo-deck', 'openrouter_api_key');
      if (stored) return stored;
    }
    const envKey = process.env.OPENROUTER_API_KEY;
    if (envKey) return envKey;
    throw new Error('[OpenRouter] Missing API Key. Configure openrouter_api_key in CredentialStore.');
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.getResolvedApiKey();
      return true;
    } catch {
      return false;
    }
  }

  async generateText(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    const key = await this.getResolvedApiKey();
    const model = options?.model || this.defaultModel;

    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 4096
    };

    if (options?.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 60000);

    try {
      const res = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'https://github.com/manav193/NIMO-DECK',
          'X-Title': 'NIMO-DECK Intelligence'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`[OpenRouter] HTTP error ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      const text = data.choices?.[0]?.message?.content ?? '';
      const promptTokens = data.usage?.prompt_tokens ?? Math.ceil(prompt.length / 4);
      const completionTokens = data.usage?.completion_tokens ?? Math.ceil(text.length / 4);
      const totalTokens = data.usage?.total_tokens ?? (promptTokens + completionTokens);
      const estimatedCostUsd = CostEstimator.estimate(model, promptTokens, completionTokens);

      return {
        text,
        usage: { promptTokens, completionTokens, totalTokens, estimatedCostUsd },
        model,
        provider: this.id
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: CompletionOptions
  ): Promise<StructuredResult<T>> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON matching the required schema. Do not include markdown codeblocks or conversational text.`;
    const result = await this.generateText(jsonPrompt, {
      ...options,
      responseFormat: 'json'
    });

    const parsedJson = extractJson(result.text);
    const parsedData = schema.parse(parsedJson);

    return {
      data: parsedData,
      usage: result.usage,
      model: result.model,
      provider: this.id
    };
  }
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip markdown ```json ... ``` blocks if present
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = match ? match[1].trim() : trimmed;
  return JSON.parse(jsonStr);
}
