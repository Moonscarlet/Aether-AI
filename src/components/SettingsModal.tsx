import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Key,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  Check,
  Info,
} from 'lucide-react';
import { AppSettings, ModelOption, ProviderId } from '../types';
import { PRESET_MODELS, PROVIDER_METADATA } from '../utils/constants';
import { maskApiKey, parseApiKeys } from '../utils/aiRouter';
import { fetchOpenRouterFreeVisionModels } from '../services/aiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<ProviderId | 'routing'>('gemini');
  const [draft, setDraft] = useState<AppSettings>(() => JSON.parse(JSON.stringify(settings)));
  const [keyInputText, setKeyInputText] = useState<Record<ProviderId, string>>({
    gemini: draft.providers.gemini.keys.join('\n'),
    groq: draft.providers.groq.keys.join('\n'),
    openrouter: draft.providers.openrouter.keys.join('\n'),
  });
  const [openRouterModels, setOpenRouterModels] = useState<ModelOption[]>(
    PRESET_MODELS.openrouter
  );
  const [isFetchingOpenRouter, setIsFetchingOpenRouter] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleKeyTextChange = (provider: ProviderId, text: string) => {
    setKeyInputText(prev => ({ ...prev, [provider]: text }));
    const parsed = parseApiKeys(text);
    setDraft(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [provider]: {
          ...prev.providers[provider],
          keys: parsed,
        },
      },
    }));
  };

  const handleFetchOpenRouterModels = async () => {
    setIsFetchingOpenRouter(true);
    try {
      const fetched = await fetchOpenRouterFreeVisionModels();
      if (fetched.length > 0) {
        setOpenRouterModels(fetched);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingOpenRouter(false);
    }
  };

  const handleSave = () => {
    onSave(draft);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const currentProviderConfig = activeTab !== 'routing' ? draft.providers[activeTab] : null;
  const currentMetadata = activeTab !== 'routing' ? PROVIDER_METADATA[activeTab] : null;
  const currentPresets = activeTab === 'openrouter' ? openRouterModels : activeTab !== 'routing' ? PRESET_MODELS[activeTab] : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings and API Configuration"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
    >
      <div
        className="w-full max-w-2xl bg-[#121215] border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-zinc-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-white">Model & Key Configuration</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              API keys are stored exclusively in your local browser storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-zinc-800/80 bg-zinc-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('gemini')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'gemini'
                ? 'border-zinc-100 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Gemini</span>
            {draft.providers.gemini.keys.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 rounded text-zinc-300">
                {draft.providers.gemini.keys.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('groq')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'groq'
                ? 'border-zinc-100 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Groq</span>
            {draft.providers.groq.keys.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 rounded text-zinc-300">
                {draft.providers.groq.keys.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('openrouter')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'openrouter'
                ? 'border-zinc-100 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>OpenRouter</span>
            {draft.providers.openrouter.keys.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 rounded text-zinc-300">
                {draft.providers.openrouter.keys.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('routing')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'routing'
                ? 'border-zinc-100 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Fallback & Priority</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab !== 'routing' && currentProviderConfig && currentMetadata && (
            <div className="space-y-5">
              {/* Provider Info Banner */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-xs">
                <div>
                  <span className="font-medium text-white">{currentMetadata.name}</span>
                  <p className="text-zinc-400 mt-0.5">{currentMetadata.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href={currentMetadata.keyLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1 text-zinc-300 hover:text-white underline decoration-zinc-600 hover:decoration-white transition-colors"
                  >
                    <span>Get API Key</span>
                    <ExternalLink className="w-3 h-3 text-zinc-500" />
                  </a>
                  <a
                    href={currentMetadata.docsLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <span>Docs</span>
                    <ExternalLink className="w-3 h-3 text-zinc-500" />
                  </a>
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="model-select" className="text-xs font-medium text-zinc-300">
                    Model Selection
                  </label>
                  {activeTab === 'openrouter' && (
                    <button
                      type="button"
                      onClick={handleFetchOpenRouterModels}
                      disabled={isFetchingOpenRouter}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isFetchingOpenRouter ? 'animate-spin' : ''}`}
                      />
                      <span>Refresh Free Vision Models</span>
                    </button>
                  )}
                </div>

                <select
                  id="model-select"
                  value={currentProviderConfig.selectedModel}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      providers: {
                        ...prev.providers,
                        [activeTab]: {
                          ...prev.providers[activeTab],
                          selectedModel: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                >
                  {currentPresets.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.id}) {model.supportsImages ? '🖼️' : '📝'}
                    </option>
                  ))}
                  <option value="custom">-- Custom Model Name --</option>
                </select>

                {currentProviderConfig.selectedModel === 'custom' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="e.g. meta-llama/llama-3.2-11b-vision-preview"
                      value={currentProviderConfig.customModel || ''}
                      onChange={e =>
                        setDraft(prev => ({
                          ...prev,
                          providers: {
                            ...prev.providers,
                            [activeTab]: {
                              ...prev.providers[activeTab],
                              customModel: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 font-mono focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                )}

                {activeTab === 'openrouter' && (
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1 pt-1">
                    <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>
                      Preset with top free models supporting text + images. Browse all free models on{' '}
                      <a
                        href="https://openrouter.ai/models?input_modalities=text,image&max_price=0&order=most-popular"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline text-zinc-300 hover:text-white"
                      >
                        OpenRouter Directory
                      </a>
                      .
                    </span>
                  </div>
                )}
              </div>

              {/* API Keys Configuration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="keys-textarea" className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-zinc-400" />
                    <span>API Keys (Multiple keys allowed for failover)</span>
                  </label>
                  <span className="text-xs font-mono text-zinc-400 tabular-nums">
                    {currentProviderConfig.keys.length} key
                    {currentProviderConfig.keys.length === 1 ? '' : 's'} registered
                  </span>
                </div>

                <textarea
                  id="keys-textarea"
                  rows={4}
                  value={keyInputText[activeTab]}
                  onChange={e => handleKeyTextChange(activeTab, e.target.value)}
                  placeholder={currentMetadata.keyPlaceholder}
                  className="w-full p-3 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 font-mono focus:outline-none focus:border-zinc-600 leading-relaxed"
                />

                <p className="text-[11px] text-zinc-500">
                  Tip: Paste one key per line or separate by commas. If a key hits rate limits (429) or timeouts, the engine automatically tries your next key seamlessly.
                </p>

                {/* Masked Preview */}
                {currentProviderConfig.keys.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[11px] font-medium text-zinc-400">Configured Failover Pool:</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {currentProviderConfig.keys.map((k, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[11px] font-mono bg-zinc-900 border border-zinc-800 rounded text-zinc-300"
                        >
                          #{idx + 1}: {maskApiKey(k)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Routing & Fallback Tab */}
          {activeTab === 'routing' && (
            <div className="space-y-5">
              {/* Primary Provider Selector */}
              <div className="space-y-2">
                <label htmlFor="primary-provider-select" className="text-xs font-medium text-zinc-300">
                  Primary Provider
                </label>
                <select
                  id="primary-provider-select"
                  value={draft.activeProvider}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      activeProvider: e.target.value as ProviderId,
                    }))
                  }
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-600"
                >
                  <option value="gemini">Google Gemini (Default: gemini-flash-latest)</option>
                  <option value="groq">Groq Cloud (Default: qwen/qwen3.8-27b)</option>
                  <option value="openrouter">OpenRouter (Default: Free Multimodal)</option>
                </select>
                <p className="text-[11px] text-zinc-500">
                  The primary provider handles prompts first. If all its keys fail or time out, fallback takes over.
                </p>
              </div>

              {/* Automatic Failover Toggles */}
              <div className="space-y-3 pt-2">
                {/* Service Failover (Off by default) */}
                <label className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                  draft.serviceFailover
                    ? 'bg-zinc-900 border-zinc-600'
                    : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900'
                }`}>
                  <input
                    type="checkbox"
                    checked={draft.serviceFailover}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        serviceFailover: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-zinc-100 focus:ring-0"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-100">
                        Cross-Service Failover
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        (Default: Off)
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 leading-relaxed">
                      Automatically switch to fallback providers ({draft.providerPriority.filter(p => p !== draft.activeProvider).join(' → ')}) if all keys for the primary service fail or time out. When disabled, requests stay strictly within the selected provider.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 cursor-pointer hover:bg-zinc-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={draft.autoFallbackOnFailure}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        autoFallbackOnFailure: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-zinc-100 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-medium text-zinc-200">
                      Multi-key failover on rate limits & errors
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Automatically rotates to subsequent API keys when receiving HTTP 429 (Rate Limit), quota exhausted, or server errors.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 cursor-pointer hover:bg-zinc-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={draft.autoFallbackOnTimeout}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        autoFallbackOnTimeout: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-800 text-zinc-100 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-medium text-zinc-200">
                      Failover on request timeout
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      If an API endpoint stalls or hangs without responding within the timeout threshold, immediately switch to the next key (or provider if service failover is enabled).
                    </div>
                  </div>
                </label>
              </div>

              {/* Timeout Threshold Slider */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="timeout-slider" className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Request Timeout Threshold</span>
                  </label>
                  <span className="text-xs font-mono text-zinc-300 tabular-nums">
                    {(draft.timeoutMs / 1000).toFixed(0)} seconds
                  </span>
                </div>
                <input
                  id="timeout-slider"
                  type="range"
                  min={10000}
                  max={90000}
                  step={5000}
                  value={draft.timeoutMs}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      timeoutMs: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-zinc-200 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* System Prompt */}
              <div className="space-y-2 pt-2">
                <label htmlFor="system-prompt" className="text-xs font-medium text-zinc-300">
                  System Instructions (Optional)
                </label>
                <textarea
                  id="system-prompt"
                  rows={2}
                  value={draft.systemPrompt}
                  onChange={e =>
                    setDraft(prev => ({
                      ...prev,
                      systemPrompt: e.target.value,
                    }))
                  }
                  placeholder="e.g. You are a concise, helpful assistant. Avoid unnecessary preamble."
                  className="w-full p-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/60">
          <div className="text-xs text-zinc-400">
            {saveSuccess ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Settings saved!
              </span>
            ) : (
              <span>Saved locally in browser</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg transition-colors shadow-sm"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
