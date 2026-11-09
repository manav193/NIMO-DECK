import type { z } from 'zod';
import type {
  AIProviderAdapter,
  CompletionOptions,
  CompletionResult,
  StructuredResult
} from './types.js';

export interface ProviderRegistryConfig {
  primaryProviderId?: string;
  fallbackProviderIds?: string[];
  maxRetries?: number;
}

export class ProviderRegistry {
  private providers = new Map<string, AIProviderAdapter>();
  private primaryProviderId: string;
  private fallbackProviderIds: string[];
  private maxRetries: number;

  constructor(config: ProviderRegistryConfig = {}) {
    this.primaryProviderId = config.primaryProviderId || 'openrouter';
    this.fallbackProviderIds = config.fallbackProviderIds || ['openai', 'gemini', 'claude', 'ollama'];
    this.maxRetries = config.maxRetries ?? 2;
  }

  registerProvider(adapter: AIProviderAdapter): void {
    this.providers.set(adapter.id, adapter);
  }

  getProvider(id: string): AIProviderAdapter | undefined {
    return this.providers.get(id);
  }

  listProviders(): AIProviderAdapter[] {
    return Array.from(this.providers.values());
  }

  setPrimaryProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Cannot set unknown provider '${id}' as primary.`);
    }
    this.primaryProviderId = id;
  }

  setFallbackProviders(ids: string[]): void {
    this.fallbackProviderIds = ids;
  }

  private getOrderedProviderChain(): AIProviderAdapter[] {
    const chain: AIProviderAdapter[] = [];
    const primary = this.providers.get(this.primaryProviderId);
    if (primary) chain.push(primary);

    for (const fbId of this.fallbackProviderIds) {
      if (fbId !== this.primaryProviderId) {
        const p = this.providers.get(fbId);
        if (p) chain.push(p);
      }
    }

    if (chain.length === 0 && this.providers.size > 0) {
      chain.push(Array.from(this.providers.values())[0]);
    }

    return chain;
  }

  async generateText(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    const chain = this.getOrderedProviderChain();
    if (chain.length === 0) {
      throw new Error('No AI providers registered in ProviderRegistry.');
    }

    const errors: Error[] = [];

    for (const provider of chain) {
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          return await provider.generateText(prompt, options);
        } catch (err) {
          const e = err instanceof Error ? err : new Error(String(err));
          errors.push(new Error(`[${provider.id}] Attempt ${attempt + 1} failed: ${e.message}`));
          if (attempt < this.maxRetries) {
            // Exponential backoff
            await new Promise((res) => setTimeout(res, 200 * Math.pow(2, attempt)));
          }
        }
      }
    }

    throw new Error(
      `All AI providers in fallback chain failed:\n${errors.map((e) => e.message).join('\n')}`
    );
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: CompletionOptions
  ): Promise<StructuredResult<T>> {
    const chain = this.getOrderedProviderChain();
    if (chain.length === 0) {
      throw new Error('No AI providers registered in ProviderRegistry.');
    }

    const errors: Error[] = [];

    for (const provider of chain) {
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          return await provider.generateStructured(prompt, schema, options);
        } catch (err) {
          const e = err instanceof Error ? err : new Error(String(err));
          errors.push(new Error(`[${provider.id}] Structured attempt ${attempt + 1} failed: ${e.message}`));
          if (attempt < this.maxRetries) {
            await new Promise((res) => setTimeout(res, 200 * Math.pow(2, attempt)));
          }
        }
      }
    }

    throw new Error(
      `All AI providers in fallback chain failed to generate structured data:\n${errors.map((e) => e.message).join('\n')}`
    );
  }
}
