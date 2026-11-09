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
import { extractJson } from './openrouter-adapter.js';

export interface OpenAIConfig {
  apiKey?: string;
  defaultModel?: string;
  baseUrl?: string;
  credentialStore?: CredentialStore;
  fetchFn?: typeof fetch;
}

export class OpenAIAdapter implements AIProviderAdapter {
  readonly id = 'openai';
  readonly name = 'OpenAI Direct API';

  private apiKey?: string;
  private defaultModel: string;
  private baseUrl: string;
  private credentialStore?: CredentialStore;
  private fetchFn: typeof fetch;

  constructor(config: OpenAIConfig = {}) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'gpt-4o';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.credentialStore = config.credentialStore;
    this.fetchFn = config.fetchFn || globalThis.fetch;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      jsonMode: true,
      maxContextTokens: 128000,
      supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
    };
  }

  private async getResolvedApiKey(): Promise<string> {
    if (this.apiKey) return this.apiKey;
    if (this.credentialStore) {
      const stored = await this.credentialStore.getPassword('nimo-deck', 'openai_api_key');
      if (stored) return stored;
    }
    const envKey = process.env.OPENAI_API_KEY;
    if (envKey) return envKey;
    throw new Error('[OpenAI] Missing API Key. Configure openai_api_key in CredentialStore.');
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
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`[OpenAI] HTTP error ${res.status}: ${err.slice(0, 200)}`);
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
    const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON adhering to the required schema.`;
    const result = await this.generateText(jsonPrompt, {
      ...options,
      responseFormat: 'json'
    });

    const parsed = extractJson(result.text);
    const data = schema.parse(parsed);

    return {
      data,
      usage: result.usage,
      model: result.model,
      provider: this.id
    };
  }
}
