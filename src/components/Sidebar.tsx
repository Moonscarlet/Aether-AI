import React from 'react';
import {
  Plus,
  Trash2,
  X,
  MessageSquare,
  Download,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { AppSettings, ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
  settings: AppSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onOpenSettings,
  settings,
}) => {
  if (!isOpen) return null;

  const handleExportMarkdown = (session: ChatSession) => {
    let md = `# ${session.title}\n*Exported from Aether AI on ${new Date().toLocaleString()}*\n\n---\n\n`;
    for (const msg of session.messages) {
      const roleName = msg.role === 'user' ? 'User' : 'Assistant';
      const time = new Date(msg.createdAt).toLocaleTimeString();
      md += `### ${roleName} (${time})\n\n${msg.content}\n\n`;
      if (msg.images && msg.images.length > 0) {
        md += `*Attached ${msg.images.length} image(s)*\n\n`;
      }
      if (msg.provider) {
        md += `> Provider: ${msg.provider} | Model: ${msg.model || 'default'} | Latency: ${msg.latencyMs || 0}ms\n\n`;
      }
      md += `---\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        onClick={onClose}
      />

      <aside
        aria-label="Chat Sessions History"
        className="fixed top-0 bottom-0 left-0 z-40 w-72 bg-[#0d0d10] border-r border-zinc-800 flex flex-col transition-transform duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Conversations</span>
            <span className="text-xs text-zinc-500 font-mono tabular-nums">
              ({sessions.length})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close conversation history sidebar"
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            aria-label="Start a new chat session"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:border-zinc-700 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              No conversations yet. Start typing to begin.
            </div>
          ) : (
            sessions.map(session => {
              const isActive = session.id === activeSessionId;
              const dateStr = new Date(session.updatedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={session.id}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-zinc-800/80 text-white font-medium'
                      : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'
                  }`}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{session.title || 'Untitled Chat'}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleExportMarkdown(session);
                      }}
                      aria-label="Export conversation as markdown"
                      title="Export as Markdown"
                      className="p-1 hover:text-white rounded hover:bg-zinc-700/60"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      aria-label="Delete this conversation"
                      title="Delete conversation"
                      className="p-1 hover:text-red-400 rounded hover:bg-zinc-700/60"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Fallback timestamp indicator when not hovering */}
                  <span className="text-[10px] text-zinc-600 font-mono tabular-nums shrink-0 group-hover:hidden">
                    {dateStr}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Provider Keys Summary */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium text-zinc-300">Active Keys</span>
            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <Sliders className="w-3 h-3" />
              <span>Configure</span>
            </button>
          </div>

          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Gemini:</span>
              <span className={settings.providers.gemini.keys.length > 0 ? 'text-emerald-400' : 'text-zinc-600'}>
                {settings.providers.gemini.keys.length} key(s)
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Groq:</span>
              <span className={settings.providers.groq.keys.length > 0 ? 'text-emerald-400' : 'text-zinc-600'}>
                {settings.providers.groq.keys.length} key(s)
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>OpenRouter:</span>
              <span className={settings.providers.openrouter.keys.length > 0 ? 'text-emerald-400' : 'text-zinc-600'}>
                {settings.providers.openrouter.keys.length} key(s)
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
