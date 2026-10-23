import { AppSettings, GenerationAttempt, ImageAttachment, ProviderConfig, ProviderId } from '../types';

/**
 * Parses user input containing one or multiple API keys.
 * Supports newline-separated, comma-separated, semicolon-separated, or whitespace-separated formats.
 */
export function parseApiKeys(input: string): string[] {
  if (!input) return [];
  return input
    .replace(/\\n/g, '\n')
    .split(/[\n,;]+/)
    .map(k => k.trim())
    .filter(k => k.length > 0 && !k.startsWith('#'));
}

/**
 * Masks an API key for safe display in the UI.
 * e.g. "AIzaSyD0...xK9"
 */
export function maskApiKey(key: string): string {
  if (!key) return '(no key)';
  const clean = key.trim();
  if (clean.length <= 8) return '****';
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

/**
 * Checks if an error status code or message is eligible for failover / fallback.
 */
export function isRetryableError(status?: number, message?: string): boolean {
  if (!status && !message) return false;
  // 429 = Rate Limited, 408 = Request Timeout, 500 = Internal Server, 502 = Bad Gateway, 503 = Service Unavailable, 504 = Gateway Timeout
  // 401 / 403 can also be tried with fallback key if the key was invalid/expired/quota exceeded
  if (status && [401, 403, 408, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }
  const msg = (message || '').toLowerCase();
  return (
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('overloaded') ||
    msg.includes('resource exhausted') ||
    msg.includes('abort') ||
    msg.includes('fetch failed') ||
    msg.includes('network')
  );
}

/**
 * Determines the next candidate provider, model, and key to attempt,
 * given the current attempt index and past attempts.
 */
export function getNextAttemptCandidate(
  settings: AppSettings,
  failedAttempts: { provider: ProviderId; keyIndex: number }[] = []
): GenerationAttempt | null {
  // If serviceFailover is enabled, try active provider first then other prioritized providers.
  // If serviceFailover is disabled (default), ONLY try keys from the active provider.
  const providerSequence: ProviderId[] = settings.serviceFailover
    ? [
        settings.activeProvider,
        ...settings.providerPriority.filter(p => p !== settings.activeProvider),
      ]
    : [settings.activeProvider];

  for (const providerId of providerSequence) {
    const config: ProviderConfig = settings.providers[providerId];
    if (!config || !config.enabled || config.keys.length === 0) {
      continue;
    }

    // Find first key in this provider that hasn't failed in this round
    for (let kIdx = 0; kIdx < config.keys.length; kIdx++) {
      const alreadyFailed = failedAttempts.some(
        f => f.provider === providerId && f.keyIndex === kIdx
      );
      if (!alreadyFailed) {
        const key = config.keys[kIdx];
        const model = config.customModel?.trim() || config.selectedModel;
        return {
          provider: providerId,
          model,
          key,
          keyIndex: kIdx,
          keyMasked: maskApiKey(key),
        };
      }
    }

    // If autoFallbackOnFailure is false, do not try next keys
    if (!settings.autoFallbackOnFailure) {
      break;
    }
  }

  return null;
}

/**
 * Formats user content and images for Gemini API payload.
 */
export function formatGeminiParts(text: string, images?: ImageAttachment[]): any[] {
  const parts: any[] = [];
  if (text.trim()) {
    parts.push({ text: text.trim() });
  }
  if (images && images.length > 0) {
    for (const img of images) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType || 'image/jpeg',
          data: img.base64Data,
        },
      });
    }
  }
  // Ensure at least an empty text part if completely empty
  if (parts.length === 0) {
    parts.push({ text: ' ' });
  }
  return parts;
}

/**
 * Formats user content and images for OpenAI-compatible APIs (Groq and OpenRouter).
 */
export function formatOpenAiContent(
  text: string,
  images?: ImageAttachment[]
): string | any[] {
  if (!images || images.length === 0) {
    return text.trim() || ' ';
  }

  const content: any[] = [];
  if (text.trim()) {
    content.push({ type: 'text', text: text.trim() });
  }
  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: img.dataUrl,
      },
    });
  }
  return content;
}

/**
 * Converts a File object to an ImageAttachment.
 */
export function fileToImageAttachment(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1] || '';
      resolve({
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        mimeType: file.type || 'image/jpeg',
        dataUrl,
        base64Data,
        size: file.size,
      });
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}
