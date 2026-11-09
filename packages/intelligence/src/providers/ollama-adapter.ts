import type { z } from 'zod';
import type {
  AIProviderAdapter,
  CompletionOptions,
  CompletionResult,
  ProviderCapabilities,
  StructuredResult
} from './types.js';
import { extractJson } from './openrouter-adapter.js';

export interface OllamaConfig {
  baseUrl?: string;
  defaultModel?: string;
  fetchFn?: typeof fetch;
}

export class OllamaAdapter implements AIProviderAdapter {
  readonly id = 'ollama';
  readonly name = 'Ollama Local AI';

  private baseUrl: string;
  private defaultModel: string;
  private fetchFn: typeof fetch;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.defaultModel = config.defaultModel || 'llama3';
    this.fetchFn = config.fetchFn || globalThis.fetch;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      jsonMode: true,
      maxContextTokens: 32768,
      supportedModels: ['llama3', 'qwen2.5-coder', 'mistral', 'codellama']
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await this.fetchFn(`${this.baseUrl}/api/tags`, {
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateText(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    const model = options?.model || this.defaultModel;

    const body: Record<string, unknown> = {
      model,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.2,
        num_predict: options?.maxTokens ?? 2048
      }
    };

    if (options?.responseFormat === 'json') {
      body.format = 'json';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 120000);

    try {
      const res = await this.fetchFn(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`[Ollama] HTTP error ${res.status}: ${err.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        response?: string;
        prompt_eval_count?: number;
        eval_count?: number;
      };

      const text = data.response ?? '';
      const promptTokens = data.prompt_eval_count ?? Math.ceil(prompt.length / 4);
      const completionTokens = data.eval_count ?? Math.ceil(text.length / 4);
      const totalTokens = promptTokens + completionTokens;

      return {
        text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCostUsd: 0.0 // Local inference is completely free
        },
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
    const result = await this.generateText(prompt, {
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
