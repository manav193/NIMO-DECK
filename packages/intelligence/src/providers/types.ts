import type { z } from 'zod';
import type { TokenUsage } from '@nimo-deck/shared';

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
  timeoutMs?: number;
}

export interface ProviderCapabilities {
  streaming: boolean;
  jsonMode: boolean;
  maxContextTokens: number;
  supportedModels: string[];
}

export interface CompletionResult {
  text: string;
  usage: TokenUsage;
  model: string;
  provider: string;
}

export interface StructuredResult<T> {
  data: T;
  usage: TokenUsage;
  model: string;
  provider: string;
}

export interface AIProviderAdapter {
  readonly id: string;
  readonly name: string;

  getCapabilities(): ProviderCapabilities;
  isAvailable(): Promise<boolean>;
  generateText(prompt: string, options?: CompletionOptions): Promise<CompletionResult>;
  generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: CompletionOptions
  ): Promise<StructuredResult<T>>;
}
