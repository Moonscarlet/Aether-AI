import { AppSettings, ModelOption, ProviderId } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  providers: {
    gemini: {
      enabled: true,
      keys: [],
      currentKeyIndex: 0,
      selectedModel: 'gemini-flash-latest',
    },
    groq: {
      enabled: true,
      keys: [],
      currentKeyIndex: 0,
      selectedModel: 'qwen/qwen3.8-27b',
    },
    openrouter: {
      enabled: true,
      keys: [],
      currentKeyIndex: 0,
      selectedModel: 'google/gemini-2.0-flash-exp:free',
    },
  },
  providerPriority: ['gemini', 'groq', 'openrouter'],
  activeProvider: 'gemini',
  serviceFailover: false, // Off by default: switch to other providers if current provider exhausts
  timeoutMs: 30000,
  autoFallbackOnFailure: true,
  autoFallbackOnTimeout: true,
  systemPrompt: '',
  streamResponses: true,
};

export const PRESET_MODELS: Record<ProviderId, ModelOption[]> = {
  gemini: [
    {
      id: 'gemini-flash-latest',
      name: 'Gemini Flash Latest',
      provider: 'gemini',
      supportsImages: true,
      description: 'Default fast multimodal flagship (recommended)',
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'gemini',
      supportsImages: true,
      description: 'Ultra-fast multimodal model with high quality reasoning',
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'gemini',
      supportsImages: true,
      description: 'Deep reasoning, complex coding, and nuanced multimodal comprehension',
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'gemini',
      supportsImages: true,
      description: 'Next-gen fast multimodal workhorse',
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'gemini',
      supportsImages: true,
      description: 'High throughput, low latency multimodal',
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'gemini',
      supportsImages: true,
      description: 'Long context 2M tokens window',
    },
  ],
  groq: [
    {
      id: 'qwen/qwen3.8-27b',
      name: 'Qwen 3.8 27B',
      provider: 'groq',
      supportsImages: false,
      description: 'Default Groq model: lightning-fast reasoning & code',
    },
    {
      id: 'meta-llama/llama-4-scout-17b-instruct',
      name: 'Llama 4 Scout 17B Instruct',
      provider: 'groq',
      supportsImages: true,
      description: 'Next-gen ultra fast multimodal model with vision',
    },
    {
      id: 'llama-3.2-11b-vision-preview',
      name: 'Llama 3.2 11B Vision',
      provider: 'groq',
      supportsImages: true,
      description: 'Fast vision model for document and image analysis',
    },
    {
      id: 'llama-3.2-90b-vision-preview',
      name: 'Llama 3.2 90B Vision',
      provider: 'groq',
      supportsImages: true,
      description: 'High capacity vision and multimodal reasoning',
    },
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      provider: 'groq',
      supportsImages: false,
      description: 'Ultra-versatile fast 70B open weight model',
    },
  ],
  openrouter: [
    {
      id: 'google/gemini-2.0-flash-exp:free',
      name: 'Gemini 2.0 Flash Exp (Free)',
      provider: 'openrouter',
      supportsImages: true,
      isFree: true,
      description: 'Google’s experimental fast multimodal model via OpenRouter Free Tier',
    },
    {
      id: 'meta-llama/llama-3.2-11b-vision-instruct:free',
      name: 'Llama 3.2 11B Vision (Free)',
      provider: 'openrouter',
      supportsImages: true,
      isFree: true,
      description: 'Free Meta vision instruction model',
    },
    {
      id: 'meta-llama/llama-3.2-90b-vision-instruct:free',
      name: 'Llama 3.2 90B Vision (Free)',
      provider: 'openrouter',
      supportsImages: true,
      isFree: true,
      description: 'Free high-parameter multimodal vision powerhouse',
    },
    {
      id: 'qwen/qwen-2.5-vl-72b-instruct:free',
      name: 'Qwen 2.5 VL 72B Instruct (Free)',
      provider: 'openrouter',
      supportsImages: true,
      isFree: true,
      description: 'Free top-tier vision-language model with OCR and visual reasoning',
    },
    {
      id: 'mistralai/mistral-small-24b-instruct-2501:free',
      name: 'Mistral Small 24B (Free)',
      provider: 'openrouter',
      supportsImages: true,
      isFree: true,
      description: 'Free efficient multimodal model from Mistral AI',
    },
    {
      id: 'deepseek/deepseek-r1:free',
      name: 'DeepSeek R1 (Free)',
      provider: 'openrouter',
      supportsImages: false,
      isFree: true,
      description: 'Free frontier reasoning model with chain-of-thought',
    },
  ],
};

export const PROVIDER_METADATA: Record<
  ProviderId,
  {
    name: string;
    description: string;
    keyLink: string;
    docsLink: string;
    keyPlaceholder: string;
    defaultModel: string;
  }
> = {
  gemini: {
    name: 'Google Gemini',
    description: 'High-speed native multimodal AI models directly from Google AI Studio.',
    keyLink: 'https://aistudio.google.com/app/apikey',
    docsLink: 'https://ai.google.dev/docs',
    keyPlaceholder: 'AIzaSy...\nAIzaSy... (add multiple keys for failover)',
    defaultModel: 'gemini-flash-latest',
  },
  groq: {
    name: 'Groq Cloud',
    description: 'Ultra-low latency LPU inference with Llama & Qwen models.',
    keyLink: 'https://console.groq.com/keys',
    docsLink: 'https://console.groq.com/docs/',
    keyPlaceholder: 'gsk_...\ngsk_... (add multiple keys for failover)',
    defaultModel: 'qwen/qwen3.8-27b',
  },
  openrouter: {
    name: 'OpenRouter',
    description: 'Unified gateway providing top free & open weights multimodal models.',
    keyLink: 'https://openrouter.ai/keys',
    docsLink: 'https://openrouter.ai/docs/quickstart',
    keyPlaceholder: 'sk-or-v1-...\nsk-or-v1-... (add multiple keys for failover)',
    defaultModel: 'google/gemini-2.0-flash-exp:free',
  },
};

export const OPENROUTER_FREE_MODELS_URL =
  'https://openrouter.ai/models?input_modalities=text,image&max_price=0&order=most-popular';
