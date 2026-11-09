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

export interface GeminiConfig {
  apiKey?: string;
  defaultModel?: string;
  baseUrl?: string;
  credentialStore?: CredentialStore;
  fetchFn?: typeof fetch;
}

export class GeminiAdapter implements AIProviderAdapter {
  readonly id = 'gemini';
  readonly name = 'Google Gemini API';

  private apiKey?: string;
  private defaultModel: string;
  private baseUrl: string;
  private credentialStore?: CredentialStore;
  private fetchFn: typeof fetch;

  constructor(config: GeminiConfig = {}) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'gemini-1.5-pro';
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this.credentialStore = config.credentialStore;
    this.fetchFn = config.fetchFn || globalThis.fetch;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      jsonMode: true,
      maxContextTokens: 1000000,
      supportedModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash']
    };
  }

  private async getResolvedApiKey(): Promise<string> {
    if (this.apiKey) return this.apiKey;
    if (this.credentialStore) {
      const stored = await this.credentialStore.getPassword('nimo-deck', 'gemini_api_key');
      if (stored) return stored;
    }
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey) return envKey;
    throw new Error('[Gemini] Missing API Key. Configure gemini_api_key in CredentialStore.');
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

    const requestBody: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxTokens ?? 4096
      }
    };

    if (options?.responseFormat === 'json') {
      (requestBody.generationConfig as Record<string, unknown>).responseMimeType =
        'application/json';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 60000);

    try {
      const url = `${this.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      const res = await this.fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`[Gemini] HTTP error ${res.status}: ${err.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const promptTokens = data.usageMetadata?.promptTokenCount ?? Math.ceil(prompt.length / 4);
      const completionTokens =
        data.usageMetadata?.candidatesTokenCount ?? Math.ceil(text.length / 4);
      const totalTokens = data.usageMetadata?.totalTokenCount ?? (promptTokens + completionTokens);
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
    const jsonPrompt = `${prompt}\n\nRespond with strict JSON adhering to the required schema.`;
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
