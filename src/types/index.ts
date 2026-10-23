export type ProviderId = 'gemini' | 'groq' | 'openrouter';

export interface ImageAttachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string; // "data:image/png;base64,..."
  base64Data: string; // raw base64 without prefix
  size: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: ImageAttachment[];
  createdAt: number;
  provider?: ProviderId;
  model?: string;
  keyMasked?: string;
  fallbackChain?: string[];
  latencyMs?: number;
  error?: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface ProviderConfig {
  enabled: boolean;
  keys: string[];
  currentKeyIndex: number;
  selectedModel: string;
  customModel?: string;
}

export interface AppSettings {
  providers: Record<ProviderId, ProviderConfig>;
  providerPriority: ProviderId[];
  activeProvider: ProviderId;
  serviceFailover: boolean; // Setting (off by default) for service failover across providers
  timeoutMs: number;
  autoFallbackOnFailure: boolean;
  autoFallbackOnTimeout: boolean;
  systemPrompt: string;
  streamResponses: boolean;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: ProviderId;
  supportsImages: boolean;
  isFree?: boolean;
  description?: string;
  contextLength?: number;
}

export interface GenerationAttempt {
  provider: ProviderId;
  model: string;
  key: string;
  keyIndex: number;
  keyMasked: string;
}

export interface FallbackStep {
  provider: ProviderId;
  model: string;
  keyMasked: string;
  reason: string;
  timestamp: number;
}
