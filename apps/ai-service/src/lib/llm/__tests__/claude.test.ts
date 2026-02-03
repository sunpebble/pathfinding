/**
 * Tests for Claude LLM Adapter
 * Tests initialization and configuration handling
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use hoisted mock for proper class mocking
const { MockChatAnthropic } = vi.hoisted(() => {
  const MockChatAnthropic = vi.fn();
  return { MockChatAnthropic };
});

vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: MockChatAnthropic,
}));

describe('claude LLM Adapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    MockChatAnthropic.mockClear();
    MockChatAnthropic.mockImplementation(function (this: unknown, config: Record<string, unknown>) {
      Object.assign(this as object, config, { _type: 'ChatAnthropic' });
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('isClaudeConfigured', () => {
    it('should return true when ANTHROPIC_API_KEY is set', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      vi.resetModules();
      const { isClaudeConfigured } = await import('../claude.js');
      expect(isClaudeConfigured()).toBe(true);
    });

    it('should return false when ANTHROPIC_API_KEY is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      vi.resetModules();
      const { isClaudeConfigured } = await import('../claude.js');
      expect(isClaudeConfigured()).toBe(false);
    });

    it('should return false for empty string API key', async () => {
      process.env.ANTHROPIC_API_KEY = '';
      vi.resetModules();
      const { isClaudeConfigured } = await import('../claude.js');
      expect(isClaudeConfigured()).toBe(false);
    });
  });

  describe('createClaudeLLM', () => {
    it('should throw error when API key is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      vi.resetModules();
      const { createClaudeLLM } = await import('../claude.js');
      expect(() => createClaudeLLM()).toThrow('ANTHROPIC_API_KEY is not set');
    });

    it('should create ChatAnthropic instance with default config', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      vi.resetModules();
      const { createClaudeLLM } = await import('../claude.js');

      createClaudeLLM();

      expect(MockChatAnthropic).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'test-key',
          temperature: 0.7,
          maxTokens: 4096,
        }),
      );
    });

    it('should use custom temperature when provided', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      vi.resetModules();
      const { createClaudeLLM } = await import('../claude.js');

      createClaudeLLM({ temperature: 0.3 });

      expect(MockChatAnthropic).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
        }),
      );
    });

    it('should use custom model when provided', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      vi.resetModules();
      const { createClaudeLLM } = await import('../claude.js');

      createClaudeLLM({ model: 'claude-3-haiku-20240307' });

      expect(MockChatAnthropic).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-haiku-20240307',
        }),
      );
    });

    it('should use ANTHROPIC_MODEL env var as default model', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      process.env.ANTHROPIC_MODEL = 'claude-3-sonnet-20240229';
      vi.resetModules();
      const { createClaudeLLM } = await import('../claude.js');

      createClaudeLLM();

      expect(MockChatAnthropic).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-sonnet-20240229',
        }),
      );
    });

    it('should include baseURL when ANTHROPIC_BASE_URL is set', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      process.env.ANTHROPIC_BASE_URL = 'https://custom.api.com';
      vi.resetModules();
      const { createClaudeLLM } = await import('../claude.js');

      createClaudeLLM();

      expect(MockChatAnthropic).toHaveBeenCalledWith(
        expect.objectContaining({
          clientOptions: { baseURL: 'https://custom.api.com' },
        }),
      );
    });
  });
});
