import React, { useState } from 'react';
import { Copy, Check, RotateCw, AlertCircle, Sparkles, User } from 'lucide-react';
import { ChatMessage, ImageAttachment } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageItemProps {
  message: ChatMessage;
  onSelectImage: (image: ImageAttachment) => void;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onSelectImage,
  onRetry,
  onOpenSettings,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`py-5 px-4 md:px-6 transition-colors ${
        isUser ? 'bg-zinc-950/40' : 'bg-transparent'
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar indicator */}
        <div className="shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-7 h-7 rounded-md bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-medium">
              <User className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center text-xs">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          )}
        </div>

        {/* Message body */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header metadata */}
          <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-200">
                {isUser ? 'You' : 'Assistant'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formattedTime}</span>
              {!isUser && message.model && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-zinc-400">{message.model}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy message text"
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                title="Copy text"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              {!isUser && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  aria-label="Regenerate response"
                  className="p-1 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                  title="Regenerate response"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Attached images preview (if any) */}
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-2.5 pt-1">
              {message.images.map(img => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onSelectImage(img)}
                  aria-label={`View attached image ${img.name}`}
                  className="group relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                >
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="w-24 h-24 object-cover group-hover:scale-105 transition-transform duration-200"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          {message.content ? (
            <div className="mt-1">
              <MarkdownRenderer content={message.content} />
            </div>
          ) : message.isStreaming ? (
            <div className="flex items-center gap-2 py-2 text-xs text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
              <span>Generating response...</span>
            </div>
          ) : null}

          {/* Error display */}
          {message.error && (
            <div className="p-3 my-2 rounded-lg border border-red-900/60 bg-red-950/30 text-xs text-red-300 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-medium text-red-200">Generation Failed</div>
                  <div className="whitespace-pre-wrap text-red-300/90">{message.error}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white transition-colors"
                  >
                    API Keys
                  </button>
                )}
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="px-2.5 py-1 rounded bg-red-900/40 border border-red-800/80 text-red-200 hover:bg-red-800/60 transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Fallback metadata footer */}
          {!isUser && !message.isStreaming && (message.latencyMs || message.fallbackChain) && (
            <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 font-mono">
              {message.provider && (
                <span>Provider: {message.provider}</span>
              )}
              {message.keyMasked && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Key: {message.keyMasked}</span>
                </>
              )}
              {message.latencyMs !== undefined && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{message.latencyMs}ms</span>
                </>
              )}
              {message.fallbackChain && message.fallbackChain.length > 1 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400/90" title={message.fallbackChain.join(' → ')}>
                    Failover resolved ({message.fallbackChain.length} attempts)
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
