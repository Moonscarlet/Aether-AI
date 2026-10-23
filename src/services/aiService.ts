import {
  AppSettings,
  ChatMessage,
  GenerationAttempt,
  ModelOption,
  ProviderId,
} from '../types';
import {
  formatGeminiParts,
  formatOpenAiContent,
  getNextAttemptCandidate,
  isRetryableError,
} from '../utils/aiRouter';

export interface SendMessageOptions {
  messages: ChatMessage[];
  settings: AppSettings;
  onChunk?: (text: string) => void;
  onFallbackNotice?: (notice: string) => void;
  signal?: AbortSignal;
}

export interface SendMessageResult {
  content: string;
  provider: ProviderId;
  model: string;
  keyMasked: string;
  fallbackChain: string[];
  latencyMs: number;
}

/**
 * Executes a streaming chat completion with automatic multi-key failover and multi-provider fallback.
 */
export async function executeChatCompletion(
  options: SendMessageOptions
): Promise<SendMessageResult> {
  const { messages, settings, onChunk, onFallbackNotice, signal: userSignal } = options;
  const startTime = Date.now();
  const failedAttempts: { provider: ProviderId; keyIndex: number; error: string }[] = [];
  const fallbackChain: string[] = [];

  while (true) {
    if (userSignal?.aborted) {
      throw new DOMException('Generation stopped by user', 'AbortError');
    }

    const candidate: GenerationAttempt | null = getNextAttemptCandidate(
      settings,
      failedAttempts
    );

    if (!candidate) {
      if (failedAttempts.length > 0) {
        const errorSummary = failedAttempts
          .map(f => `${f.provider} (key #${f.keyIndex + 1}): ${f.error}`)
          .join('\n');
        const failoverHint = !settings.serviceFailover
          ? '\n\nNote: Service Failover is currently OFF. You can turn on "Cross-Service Failover" in Settings to automatically fall back to other providers.'
          : '';
        throw new Error(
          `All configured keys failed:\n${errorSummary}${failoverHint}\n\nPlease check your API keys or rate limits in Settings.`
        );
      }
      throw new Error(
        'No valid API keys configured. Please open Settings and enter an API key for Gemini, Groq, or OpenRouter.'
      );
    }

    const currentChainEntry = `${candidate.provider} (${candidate.model} · ${candidate.keyMasked})`;

    // Setup per-request timeout abort controller
    const timeoutController = new AbortController();
    const timeoutDuration = Math.max(5000, settings.timeoutMs || 30000);
    let timeoutTimer: any = null;

    if (settings.autoFallbackOnTimeout) {
      timeoutTimer = setTimeout(() => {
        timeoutController.abort(new DOMException(`Request timed out after ${timeoutDuration / 1000}s`, 'TimeoutError'));
      }, timeoutDuration);
    }

    // Link user abort signal
    const combinedSignalHandler = () => {
      timeoutController.abort(new DOMException('Generation stopped by user', 'AbortError'));
    };
    if (userSignal) {
      userSignal.addEventListener('abort', combinedSignalHandler, { once: true });
    }

    try {
      let accumulatedText = '';
      const onProgress = (token: string) => {
        accumulatedText += token;
        onChunk?.(accumulatedText);
      };

      if (candidate.provider === 'gemini') {
        await streamGemini(
          candidate.key,
          candidate.model,
          messages,
          settings.systemPrompt,
          onProgress,
          timeoutController.signal
        );
      } else if (candidate.provider === 'groq') {
        await streamOpenAiCompatible(
          'https://api.groq.com/openai/v1/chat/completions',
          candidate.key,
          candidate.model,
          messages,
          settings.systemPrompt,
          onProgress,
          timeoutController.signal,
          {}
        );
      } else if (candidate.provider === 'openrouter') {
        await streamOpenAiCompatible(
          'https://openrouter.ai/api/v1/chat/completions',
          candidate.key,
          candidate.model,
          messages,
          settings.systemPrompt,
          onProgress,
          timeoutController.signal,
          {
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
            'X-Title': 'Aether AI Minimalist Chat',
          }
        );
      }

      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (userSignal) userSignal.removeEventListener('abort', combinedSignalHandler);

      return {
        content: accumulatedText,
        provider: candidate.provider,
        model: candidate.model,
        keyMasked: candidate.keyMasked,
        fallbackChain: fallbackChain.length > 0 ? [...fallbackChain, currentChainEntry] : [currentChainEntry],
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (userSignal) userSignal.removeEventListener('abort', combinedSignalHandler);

      // If user stopped it manually, rethrow and do not failover
      if (userSignal?.aborted || err.name === 'AbortError' && !err.message?.includes('timed out')) {
        throw err;
      }

      const errorMessage = err.message || 'Unknown network or API error';
      failedAttempts.push({
        provider: candidate.provider,
        keyIndex: candidate.keyIndex,
        error: errorMessage,
      });

      fallbackChain.push(`${candidate.provider} (${candidate.keyMasked}) - Failed: ${errorMessage}`);

      // Notify UI of failover transition
      onFallbackNotice?.(
        `${candidate.provider} (${candidate.keyMasked}) failed (${errorMessage.slice(0, 40)}...). Switching to fallback...`
      );

      // Check if retryable / failover is enabled
      const retryable = isRetryableError(err.status, errorMessage);
      if (!retryable && !settings.autoFallbackOnFailure) {
        throw err;
      }

      // Small delay before next retry to avoid instant flood
      await new Promise(r => setTimeout(r, 400));
    }
  }
}

/**
 * Streams Gemini API directly using official REST SSE endpoint.
 */
async function streamGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string,
  onProgress: (chunk: string) => void,
  signal: AbortSignal
): Promise<void> {
  const cleanModel = model.replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  // Convert ChatMessages to Gemini format
  const contents = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: formatGeminiParts(m.content, m.images),
    }));

  const body: any = { contents };
  if (systemPrompt && systemPrompt.trim()) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt.trim() }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let errDetail = '';
    try {
      const errJson = await response.json();
      errDetail = errJson.error?.message || response.statusText;
    } catch {
      errDetail = response.statusText;
    }
    const error: any = new Error(`Gemini error (${response.status}): ${errDetail}`);
    error.status = response.status;
    throw error;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported by browser environment.');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const jsonStr = trimmed.slice(6).trim();
      if (!jsonStr) continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const candidates = parsed.candidates || [];
        if (candidates.length > 0) {
          const parts = candidates[0].content?.parts || [];
          for (const p of parts) {
            if (p.text) {
              onProgress(p.text);
            }
          }
        }
      } catch {
        // Ignore partial chunk parse error
      }
    }
  }
}

/**
 * Streams OpenAI-compatible endpoints (Groq, OpenRouter).
 */
async function streamOpenAiCompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string,
  onProgress: (chunk: string) => void,
  signal: AbortSignal,
  extraHeaders: Record<string, string> = {}
): Promise<void> {
  const formattedMessages: any[] = [];

  if (systemPrompt && systemPrompt.trim()) {
    formattedMessages.push({
      role: 'system',
      content: systemPrompt.trim(),
    });
  }

  for (const m of messages) {
    if (m.role === 'user') {
      formattedMessages.push({
        role: 'user',
        content: formatOpenAiContent(m.content, m.images),
      });
    } else if (m.role === 'assistant') {
      formattedMessages.push({
        role: 'assistant',
        content: m.content || ' ',
      });
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    let errDetail = '';
    try {
      const errJson = await response.json();
      errDetail = errJson.error?.message || errJson.message || response.statusText;
    } catch {
      errDetail = response.statusText;
    }
    const error: any = new Error(`${endpoint.includes('groq') ? 'Groq' : 'OpenRouter'} error (${response.status}): ${errDetail}`);
    error.status = response.status;
    throw error;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported by browser environment.');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const dataContent = trimmed.slice(6).trim();
      if (dataContent === '[DONE]') {
        return;
      }

      try {
        const parsed = JSON.parse(dataContent);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          onProgress(delta);
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }
}

/**
 * Fetches free vision models dynamically from OpenRouter public API.
 */
export async function fetchOpenRouterFreeVisionModels(): Promise<ModelOption[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenRouter models: ${response.status}`);
    }

    const data = await response.json();
    const rawList: any[] = data.data || [];

    // Filter free models that support images
    const freeVisionModels = rawList.filter(m => {
      const isFree =
        m.pricing?.prompt === '0' ||
        m.pricing?.prompt === 0 ||
        m.id?.endsWith(':free');

      const isMultimodal =
        m.architecture?.modality?.includes('image') ||
        m.description?.toLowerCase().includes('vision') ||
        m.description?.toLowerCase().includes('image') ||
        m.id?.toLowerCase().includes('vision') ||
        m.id?.toLowerCase().includes('vl');

      return isFree && isMultimodal;
    });

    return freeVisionModels.map(m => ({
      id: m.id,
      name: m.name || m.id,
      provider: 'openrouter',
      supportsImages: true,
      isFree: true,
      description: m.description ? `${m.description.slice(0, 80)}...` : 'Free multimodal model on OpenRouter',
      contextLength: m.context_length,
    }));
  } catch (err) {
    console.warn('Error fetching live OpenRouter free models:', err);
    return [];
  }
}
