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

export interface ClaudeConfig {
  apiKey?: string;
  defaultModel?: string;
  baseUrl?: string;
  credentialStore?: CredentialStore;
  fetchFn?: typeof fetch;
}

export class ClaudeAdapter implements AIProviderAdapter {
  readonly id = 'claude';
  readonly name = 'Anthropic Claude API';

  private apiKey?: string;
  private defaultModel: string;
  private baseUrl: string;
  private credentialStore?: CredentialStore;
  private fetchFn: typeof fetch;

  constructor(config: ClaudeConfig = {}) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'claude-3-5-sonnet-20241022';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.credentialStore = config.credentialStore;
    this.fetchFn = config.fetchFn || globalThis.fetch;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      jsonMode: true,
      maxContextTokens: 200000,
      supportedModels: [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229'
      ]
    };
  }

  private async getResolvedApiKey(): Promise<string> {
    if (this.apiKey) return this.apiKey;
    if (this.credentialStore) {
      const stored = await this.credentialStore.getPassword('nimo-deck', 'anthropic_api_key');
      if (stored) return stored;
    }
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey) return envKey;
    throw new Error('[Claude] Missing API Key. Configure anthropic_api_key in CredentialStore.');
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 60000);

    try {
      const res = await this.fetchFn(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`[Claude] HTTP error ${res.status}: ${err.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        content?: Array<{ type?: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };

      const text = data.content?.[0]?.text ?? '';
      const promptTokens = data.usage?.input_tokens ?? Math.ceil(prompt.length / 4);
      const completionTokens = data.usage?.output_tokens ?? Math.ceil(text.length / 4);
      const totalTokens = promptTokens + completionTokens;
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
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with pure JSON matching the requested schema. Do not enclose in markdown blocks if possible, or use standard \`\`\`json.`;
    const result = await this.generateText(jsonPrompt, options);

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
