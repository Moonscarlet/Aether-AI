import React from 'react';
import { Sliders, Plus, Trash2, History, ExternalLink } from 'lucide-react';
import { AppSettings, ProviderId } from '../types';

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onNewChat: () => void;
  onClearChat: () => void;
  onToggleSidebar: () => void;
  hasMessages: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  onNewChat,
  onClearChat,
  onToggleSidebar,
  hasMessages,
}) => {
  const activeConfig = settings.providers[settings.activeProvider];
  const activeModel = activeConfig?.customModel || activeConfig?.selectedModel || 'gemini-flash-latest';
  const totalKeys = Object.values(settings.providers).reduce(
    (acc, p) => acc + (p.keys?.length || 0),
    0
  );

  return (
    <header className="flex items-center justify-between gap-8 px-5 py-3.5 border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-30">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle chat history drawer"
          className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
          title="Chat History"
        >
          <History className="w-4 h-4" />
        </button>
        <span className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
          Aether AI
        </span>
        <span className="hidden sm:inline text-xs text-zinc-500 font-mono">
          · {activeModel}
        </span>
      </div>

      {/* Zone 2: Navigation / Quick Actions */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
        <button
          type="button"
          onClick={onNewChat}
          className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
        {hasMessages && (
          <button
            type="button"
            onClick={onClearChat}
            className="flex items-center gap-1.5 hover:text-red-300 transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        )}
        <a
          href="https://openrouter.ai/models?input_modalities=text,image&max_price=0&order=most-popular"
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-1 hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <span>Free Models</span>
          <ExternalLink className="w-3 h-3 text-zinc-500" />
        </a>
      </nav>

      {/* Zone 3: 1 Primary Action (Settings) */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Configure API keys and model settings"
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          <span>Settings</span>
          {totalKeys > 0 ? (
            <span className="text-[11px] font-mono text-emerald-400 tabular-nums">
              ({totalKeys} {totalKeys === 1 ? 'key' : 'keys'})
            </span>
          ) : (
            <span className="text-[11px] font-mono text-amber-400">
              (Setup Key)
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
