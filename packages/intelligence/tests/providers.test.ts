import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { OpenRouterAdapter } from '../src/providers/openrouter-adapter.js';
import { GeminiAdapter } from '../src/providers/gemini-adapter.js';
import { OpenAIAdapter } from '../src/providers/openai-adapter.js';
import { ClaudeAdapter } from '../src/providers/claude-adapter.js';
import { OllamaAdapter } from '../src/providers/ollama-adapter.js';
import { ProviderRegistry } from '../src/providers/provider-registry.js';
import { CostEstimator } from '../src/providers/cost-estimator.js';
import { InMemoryCredentialStore } from '@nimo-deck/core';

describe('@nimo-deck/intelligence: Provider Adapters & Registry', () => {
  it('should accurately calculate token cost estimates across models', () => {
    // 10,000 prompt tokens, 2,000 completion tokens on gpt-4o ($2.50 / $10.00 per 1M)
    const costGpt4o = CostEstimator.estimate('gpt-4o', 10000, 2000);
    expect(costGpt4o).toBe(0.045);

    // Ollama is always $0.00
    const costOllama = CostEstimator.estimate('llama3', 10000, 2000);
    expect(costOllama).toBe(0.0);
  });

  it('should generate text and structured output using OpenRouter adapter with mocked fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"architecturalPattern":"Modular Monorepo"}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 }
      })
    });

    const adapter = new OpenRouterAdapter({
      apiKey: 'test-openrouter-key',
      fetchFn: mockFetch as any
    });

    expect(await adapter.isAvailable()).toBe(true);
    expect(adapter.getCapabilities().jsonMode).toBe(true);

    const schema = z.object({ architecturalPattern: z.string() });
    const structured = await adapter.generateStructured('Analyze project', schema);

    expect(structured.data.architecturalPattern).toBe('Modular Monorepo');
    expect(structured.usage.totalTokens).toBe(120);
    expect(structured.provider).toBe('openrouter');
  });

  it('should generate structured output using Google Gemini adapter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"techDebtScore":"LOW"}' }] } }],
        usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 25, totalTokenCount: 175 }
      })
    });

    const adapter = new GeminiAdapter({
      apiKey: 'test-gemini-key',
      fetchFn: mockFetch as any
    });

    const schema = z.object({ techDebtScore: z.string() });
    const res = await adapter.generateStructured('Evaluate tech debt', schema);
    expect(res.data.techDebtScore).toBe('LOW');
    expect(res.usage.totalTokens).toBe(175);
    expect(res.provider).toBe('gemini');
  });

  it('should generate text using OpenAI adapter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Clean architecture design confirmed.' } }],
        usage: { prompt_tokens: 80, completion_tokens: 15, total_tokens: 95 }
      })
    });

    const adapter = new OpenAIAdapter({
      apiKey: 'test-openai-key',
      fetchFn: mockFetch as any
    });

    const res = await adapter.generateText('Assess architecture');
    expect(res.text).toContain('Clean architecture');
    expect(res.provider).toBe('openai');
  });

  it('should generate text using Anthropic Claude adapter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: 'Recommended upgrade to Node 22 LTS.' }],
        usage: { input_tokens: 50, output_tokens: 12 }
      })
    });

    const adapter = new ClaudeAdapter({
      apiKey: 'test-anthropic-key',
      fetchFn: mockFetch as any
    });

    const res = await adapter.generateText('Suggest node upgrades');
    expect(res.text).toContain('Node 22 LTS');
    expect(res.provider).toBe('claude');
  });

  it('should support local Ollama adapter with zero API cost and offline check', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/tags')) {
        return { ok: true };
      }
      return {
        ok: true,
        json: async () => ({
          response: '{"offlineInference":true}',
          prompt_eval_count: 40,
          eval_count: 10
        })
      };
    });

    const adapter = new OllamaAdapter({ fetchFn: mockFetch as any });
    expect(await adapter.isAvailable()).toBe(true);

    const schema = z.object({ offlineInference: z.boolean() });
    const res = await adapter.generateStructured('Check offline', schema);
    expect(res.data.offlineInference).toBe(true);
    expect(res.usage.estimatedCostUsd).toBe(0);
    expect(res.provider).toBe('ollama');
  });

  it('should resolve credentials securely from CredentialStore without leaking to frontend', async () => {
    const store = new InMemoryCredentialStore();
    await store.setPassword('nimo-deck', 'openrouter_api_key', 'sk-or-stored-secret-key');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Authenticated via store.' } }]
      })
    });

    const adapter = new OpenRouterAdapter({
      credentialStore: store,
      fetchFn: mockFetch as any
    });

    expect(await adapter.isAvailable()).toBe(true);
    await adapter.generateText('Test');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/chat/completions'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-or-stored-secret-key'
        })
      })
    );
  });

  it('should gracefully fallback to secondary provider when primary provider fails', async () => {
    const failingPrimary = new OpenRouterAdapter({
      apiKey: 'primary-key',
      fetchFn: vi.fn().mockRejectedValue(new Error('Rate limit 429')) as any
    });

    const successfulFallback = new OpenAIAdapter({
      apiKey: 'secondary-key',
      fetchFn: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Fallback response from OpenAI.' } }]
        })
      }) as any
    });

    const registry = new ProviderRegistry({
      primaryProviderId: 'openrouter',
      fallbackProviderIds: ['openai'],
      maxRetries: 1
    });

    registry.registerProvider(failingPrimary);
    registry.registerProvider(successfulFallback);

    const result = await registry.generateText('Analyze resilience');
    expect(result.text).toContain('Fallback response from OpenAI');
    expect(result.provider).toBe('openai');
  });
});
