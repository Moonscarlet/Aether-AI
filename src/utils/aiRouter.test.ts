import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseApiKeys,
  maskApiKey,
  isRetryableError,
  getNextAttemptCandidate,
  formatGeminiParts,
  formatOpenAiContent,
} from './aiRouter';
import { AppSettings, ImageAttachment } from '../types';

test('parseApiKeys splits by newlines, commas, and ignores whitespace/comments', () => {
  const input = `
    AIzaSyABC123, AIzaSyDEF456
    # commented key
    AIzaSyGHI789;AIzaSyJKL000
    gsk_sampleKey_111
  `;
  const keys = parseApiKeys(input);
  assert.equal(keys.length, 5);
  assert.equal(keys[0], 'AIzaSyABC123');
  assert.equal(keys[1], 'AIzaSyDEF456');
  assert.equal(keys[2], 'AIzaSyGHI789');
  assert.equal(keys[3], 'AIzaSyJKL000');
  assert.equal(keys[4], 'gsk_sampleKey_111');
});

test('maskApiKey properly masks keys for safe UI presentation', () => {
  assert.equal(maskApiKey('AIzaSyD0xyz123456789'), 'AIzaSy...6789');
  assert.equal(maskApiKey('short'), '****');
  assert.equal(maskApiKey(''), '(no key)');
});

test('isRetryableError identifies rate limits, timeouts, and server errors', () => {
  assert.equal(isRetryableError(429, 'Rate limit exceeded'), true);
  assert.equal(isRetryableError(503, 'Service unavailable'), true);
  assert.equal(isRetryableError(408, 'Request timed out'), true);
  assert.equal(isRetryableError(401, 'Invalid API key'), true);
  assert.equal(isRetryableError(undefined, 'The user aborted a request.'), true);
  assert.equal(isRetryableError(400, 'Invalid JSON payload'), false);
});

test('getNextAttemptCandidate respects serviceFailover false by default and switches when true', () => {
  const baseSettings: AppSettings = {
    providers: {
      gemini: {
        enabled: true,
        keys: ['gemini-key-1', 'gemini-key-2'],
        currentKeyIndex: 0,
        selectedModel: 'gemini-flash-latest',
      },
      groq: {
        enabled: true,
        keys: ['groq-key-1'],
        currentKeyIndex: 0,
        selectedModel: 'qwen/qwen3.8-27b',
      },
      openrouter: {
        enabled: false,
        keys: [],
        currentKeyIndex: 0,
        selectedModel: 'google/gemini-2.0-flash-exp:free',
      },
    },
    providerPriority: ['gemini', 'groq', 'openrouter'],
    activeProvider: 'gemini',
    serviceFailover: false, // Default is OFF
    timeoutMs: 30000,
    autoFallbackOnFailure: true,
    autoFallbackOnTimeout: true,
    systemPrompt: '',
    streamResponses: true,
  };

  // Attempt 1: Should pick gemini key 0
  const candidate1 = getNextAttemptCandidate(baseSettings, []);
  assert.ok(candidate1);
  assert.equal(candidate1.provider, 'gemini');
  assert.equal(candidate1.key, 'gemini-key-1');
  assert.equal(candidate1.model, 'gemini-flash-latest');

  // Attempt 2 (gemini key 0 failed): Multi-key within same service should pick gemini key 1
  const candidate2 = getNextAttemptCandidate(baseSettings, [
    { provider: 'gemini', keyIndex: 0 },
  ]);
  assert.ok(candidate2);
  assert.equal(candidate2.provider, 'gemini');
  assert.equal(candidate2.key, 'gemini-key-2');

  // Attempt 3 with serviceFailover = false: Both gemini keys failed -> returns null (does not switch to Groq)
  const candidate3NoFailover = getNextAttemptCandidate(baseSettings, [
    { provider: 'gemini', keyIndex: 0 },
    { provider: 'gemini', keyIndex: 1 },
  ]);
  assert.equal(candidate3NoFailover, null);

  // Attempt 3 with serviceFailover = true: switches over to Groq
  const settingsWithFailover: AppSettings = {
    ...baseSettings,
    serviceFailover: true,
  };
  const candidate3WithFailover = getNextAttemptCandidate(settingsWithFailover, [
    { provider: 'gemini', keyIndex: 0 },
    { provider: 'gemini', keyIndex: 1 },
  ]);
  assert.ok(candidate3WithFailover);
  assert.equal(candidate3WithFailover.provider, 'groq');
  assert.equal(candidate3WithFailover.key, 'groq-key-1');
  assert.equal(candidate3WithFailover.model, 'qwen/qwen3.8-27b');
});

test('formatGeminiParts formats text and images correctly', () => {
  const dummyImg: ImageAttachment = {
    id: '1',
    name: 'test.png',
    mimeType: 'image/png',
    dataUrl: 'data:image/png;base64,iVBORw0KGgo...',
    base64Data: 'iVBORw0KGgo...',
    size: 100,
  };

  const parts = formatGeminiParts('Hello world', [dummyImg]);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].text, 'Hello world');
  assert.equal(parts[1].inlineData.mimeType, 'image/png');
  assert.equal(parts[1].inlineData.data, 'iVBORw0KGgo...');
});

test('formatOpenAiContent formats text and image_url correctly', () => {
  const dummyImg: ImageAttachment = {
    id: '1',
    name: 'test.png',
    mimeType: 'image/png',
    dataUrl: 'data:image/png;base64,iVBORw0KGgo...',
    base64Data: 'iVBORw0KGgo...',
    size: 100,
  };

  const content = formatOpenAiContent('Describe this', [dummyImg]);
  assert.ok(Array.isArray(content));
  assert.equal(content.length, 2);
  assert.equal(content[0].type, 'text');
  assert.equal(content[1].type, 'image_url');
  assert.equal(content[1].image_url.url, 'data:image/png;base64,iVBORw0KGgo...');
});
