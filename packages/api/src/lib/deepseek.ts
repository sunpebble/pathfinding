import { registerProvider } from '@flue/runtime';

export type DeepSeekRole = 'system' | 'user' | 'assistant';

export interface DeepSeekMessage {
  role: DeepSeekRole;
  content: string;
}

interface DeepSeekCompletionOptions {
  jsonMode?: boolean;
  signal?: AbortSignal;
}

export class DeepSeekConfigError extends Error {
  constructor(message = 'DeepSeek API key not configured') {
    super(message);
    this.name = 'DeepSeekConfigError';
  }
}

export class DeepSeekAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'DeepSeekAPIError';
  }
}

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash';

function stripProviderPrefix(value: string) {
  return value.startsWith('deepseek/') ? value.slice('deepseek/'.length) : value;
}

function configuredModel() {
  const explicitModel = process.env.DEEPSEEK_MODEL?.trim();
  if (explicitModel) {
    return stripProviderPrefix(explicitModel);
  }

  const modelSpecifier = process.env.MODEL_SPECIFIER?.trim();
  if (modelSpecifier?.startsWith('deepseek/')) {
    return stripProviderPrefix(modelSpecifier);
  }

  return DEFAULT_MODEL;
}

export function getDeepSeekBaseURL() {
  return (process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

export function getDeepSeekModel() {
  return configuredModel();
}

export function getDeepSeekModelSpecifier() {
  return `deepseek/${getDeepSeekModel()}`;
}

export function registerDeepSeekProvider() {
  registerProvider('deepseek', {
    api: 'openai-completions',
    baseUrl: getDeepSeekBaseURL(),
    apiKey: process.env.DEEPSEEK_API_KEY,
    contextWindow: 64_000,
    maxTokens: 4_096,
    models: {
      [getDeepSeekModel()]: {
        contextWindow: 64_000,
        maxTokens: 4_096,
      },
    },
  });
}

function requireDeepSeekAPIKey() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new DeepSeekConfigError();
  }
  return apiKey;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractAssistantContent(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    throw new DeepSeekAPIError('Invalid DeepSeek response');
  }

  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw new DeepSeekAPIError('Invalid DeepSeek response');
  }

  const content = firstChoice.message.content;
  if (typeof content !== 'string' || content.trim() === '') {
    throw new DeepSeekAPIError('Empty DeepSeek response');
  }

  return content.trim();
}

export async function deepSeekCompletion(
  messages: DeepSeekMessage[],
  options: DeepSeekCompletionOptions = {},
) {
  const apiKey = requireDeepSeekAPIKey();
  const body: Record<string, unknown> = {
    model: getDeepSeekModel(),
    messages,
    stream: false,
    thinking: { type: 'disabled' },
  };

  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(`${getDeepSeekBaseURL()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new DeepSeekAPIError(`DeepSeek API error: ${response.status}`, response.status);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(responseText);
  }
  catch {
    throw new DeepSeekAPIError('Invalid DeepSeek JSON response');
  }

  return extractAssistantContent(payload);
}
