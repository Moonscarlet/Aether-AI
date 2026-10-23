/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Sliders,
  AlertTriangle,
  Key,
  ExternalLink,
  Zap,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import {
  AppSettings,
  ChatMessage,
  ChatSession,
  ImageAttachment,
} from './types';
import {
  loadActiveSessionId,
  loadSessions,
  loadSettings,
  saveActiveSessionId,
  saveSessions,
  saveSettings,
  createNewSession,
} from './utils/storage';
import { executeChatCompletion } from './services/aiService';
import { Header } from './components/Header';
import { ChatMessageItem } from './components/ChatMessageItem';
import { ChatInput } from './components/ChatInput';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { ImageLightbox } from './components/ImageLightbox';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const loaded = loadSessions();
    if (loaded.length > 0) return loaded;
    const initial = createNewSession();
    return [initial];
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedId = loadActiveSessionId();
    const loaded = loadSessions();
    if (savedId && loaded.some(s => s.id === savedId)) return savedId;
    return loaded[0]?.id || '';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<ImageAttachment | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Synchronize settings changes to localStorage
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Synchronize sessions to localStorage
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Synchronize active session ID to localStorage
  useEffect(() => {
    if (activeSessionId) {
      saveActiveSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  // Current session lookup
  const activeSession =
    sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isStreaming]);

  // Ensure an active session always exists
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const totalKeysConfigured = Object.values(settings.providers).reduce(
    (acc, p) => acc + (p.keys?.length || 0),
    0
  );

  const handleNewChat = () => {
    const newSess = createNewSession();
    setSessions(prev => [newSess, ...prev]);
    setActiveSessionId(newSess.id);
  };

  const handleClearChat = () => {
    if (!activeSession) return;
    setSessions(prev =>
      prev.map(s =>
        s.id === activeSession.id
          ? { ...s, messages: [], updatedAt: Date.now() }
          : s
      )
    );
  };

  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    if (updated.length === 0) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
    } else {
      setSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id);
      }
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleSendMessage = async (
    text: string,
    images: ImageAttachment[] = []
  ) => {
    if (!activeSession || isStreaming) return;

    // Check if user has at least one key configured
    if (totalKeysConfigured === 0) {
      setIsSettingsOpen(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role: 'user',
      content: text,
      images,
      createdAt: Date.now(),
    };

    const assistantPlaceholderId = `asst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const assistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      isStreaming: true,
    };

    // Update session title on first message
    const updatedTitle =
      activeSession.messages.length === 0
        ? text.slice(0, 32) || 'Image Query'
        : activeSession.title;

    const newMessages = [...activeSession.messages, userMessage, assistantMessage];

    setSessions(prev =>
      prev.map(s =>
        s.id === activeSession.id
          ? {
              ...s,
              title: updatedTitle,
              messages: newMessages,
              updatedAt: Date.now(),
            }
          : s
      )
    );

    setIsStreaming(true);
    setFallbackNotice(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await executeChatCompletion({
        messages: [...activeSession.messages, userMessage],
        settings,
        onChunk: accumulatedText => {
          setSessions(prev =>
            prev.map(s => {
              if (s.id !== activeSession.id) return s;
              return {
                ...s,
                messages: s.messages.map(m =>
                  m.id === assistantPlaceholderId
                    ? { ...m, content: accumulatedText, isStreaming: true }
                    : m
                ),
              };
            })
          );
        },
        onFallbackNotice: notice => {
          setFallbackNotice(notice);
        },
        signal: controller.signal,
      });

      // Complete assistant message with metadata
      setSessions(prev =>
        prev.map(s => {
          if (s.id !== activeSession.id) return s;
          return {
            ...s,
            messages: s.messages.map(m =>
              m.id === assistantPlaceholderId
                ? {
                    ...m,
                    content: result.content,
                    provider: result.provider,
                    model: result.model,
                    keyMasked: result.keyMasked,
                    fallbackChain: result.fallbackChain,
                    latencyMs: result.latencyMs,
                    isStreaming: false,
                  }
                : m
            ),
          };
        })
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User intentionally aborted
        setSessions(prev =>
          prev.map(s => {
            if (s.id !== activeSession.id) return s;
            return {
              ...s,
              messages: s.messages.map(m =>
                m.id === assistantPlaceholderId
                  ? {
                      ...m,
                      content: m.content || '(Generation stopped)',
                      isStreaming: false,
                    }
                  : m
              ),
            };
          })
        );
      } else {
        // Real failure across fallback attempts
        setSessions(prev =>
          prev.map(s => {
            if (s.id !== activeSession.id) return s;
            return {
              ...s,
              messages: s.messages.map(m =>
                m.id === assistantPlaceholderId
                  ? {
                      ...m,
                      content: m.content,
                      error: err.message || 'Failed to complete generation',
                      isStreaming: false,
                    }
                  : m
              ),
            };
          })
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = () => {
    if (!activeSession || activeSession.messages.length === 0) return;
    const lastUserIdx = [...activeSession.messages]
      .map((m, idx) => ({ m, idx }))
      .reverse()
      .find(item => item.m.role === 'user');

    if (!lastUserIdx) return;

    const userMsg = lastUserIdx.m;
    // Remove last assistant response and re-send
    const trimmedMessages = activeSession.messages.slice(0, lastUserIdx.idx);
    setSessions(prev =>
      prev.map(s =>
        s.id === activeSession.id
          ? { ...s, messages: trimmedMessages }
          : s
      )
    );
    handleSendMessage(userMsg.content, userMsg.images);
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-[#f4f4f5] overflow-hidden">
      {/* Sidebar for chat history */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        settings={settings}
      />

      {/* Main chat view */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header
          settings={settings}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNewChat={handleNewChat}
          onClearChat={handleClearChat}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          hasMessages={(activeSession?.messages?.length || 0) > 0}
        />

        {/* Fallback notification toast */}
        {fallbackNotice && (
          <div className="bg-amber-950/70 border-b border-amber-800/80 px-4 py-2 text-xs text-amber-200 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{fallbackNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setFallbackNotice(null)}
              className="text-amber-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Message Feed / Empty State */}
        <div className="flex-1 overflow-y-auto">
          {(!activeSession || activeSession.messages.length === 0) ? (
            <div className="max-w-2xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center space-y-8">
              {/* Brand mark */}
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Aether AI
                </h1>
                <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Minimalist dark-themed multimodal chat with resilient multi-key failover and cross-provider fallback.
                </p>
              </div>

              {/* API Keys Banner if empty */}
              {totalKeysConfigured === 0 ? (
                <div className="w-full p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-left space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Key className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-white">Configure Your API Keys</div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          Enter your Google Gemini, Groq, or OpenRouter keys. You can provide multiple keys for automatic rate-limit failover.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg transition-colors shrink-0 shadow-sm"
                    >
                      Enter Keys
                    </button>
                  </div>
                  <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-4 text-[11px] text-zinc-400">
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="hover:text-white underline decoration-zinc-700"
                    >
                      Gemini Key (Free)
                    </a>
                    <span aria-hidden="true">·</span>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="hover:text-white underline decoration-zinc-700"
                    >
                      Groq Key (Fast LPU)
                    </a>
                    <span aria-hidden="true">·</span>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="hover:text-white underline decoration-zinc-700"
                    >
                      OpenRouter (Free Models)
                    </a>
                  </div>
                </div>
              ) : (
                /* Feature overview cards */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full text-left">
                  <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-1.5">
                    <div className="text-xs font-medium text-zinc-200">Google Gemini</div>
                    <div className="text-[11px] text-zinc-400 font-mono">gemini-flash-latest</div>
                    <div className="text-[11px] text-zinc-500">
                      Native multimodal vision + text. {settings.providers.gemini.keys.length} key(s) ready.
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-1.5">
                    <div className="text-xs font-medium text-zinc-200">Groq Cloud</div>
                    <div className="text-[11px] text-zinc-400 font-mono">qwen/qwen3.8-27b</div>
                    <div className="text-[11px] text-zinc-500">
                      Ultra-low latency inference. {settings.providers.groq.keys.length} key(s) ready.
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-1.5">
                    <div className="text-xs font-medium text-zinc-200">OpenRouter Free</div>
                    <div className="text-[11px] text-zinc-400 font-mono">Free Multimodal</div>
                    <div className="text-[11px] text-zinc-500">
                      Unified gateway with free vision models.
                    </div>
                  </div>
                </div>
              )}

              {/* Starter suggestions */}
              <div className="w-full space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                  Try asking or pasting
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        'Summarize the core differences between Gemini 2.5 Flash and open weight models.'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    Compare Gemini Flash vs Open Models
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        'Write a TypeScript function to parse markdown tables with clean code formatting.'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    Generate TypeScript Code
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        'What are the best practices for setting up AI API multi-key failover and rate limit retry backoff?'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    API Failover Best Practices
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-900 pb-8">
              {activeSession.messages.map(msg => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  onSelectImage={setLightboxImage}
                  onRetry={handleRetry}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <ChatInput
          onSend={handleSendMessage}
          onStop={handleStop}
          isStreaming={isStreaming}
          disabled={false}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />

      {/* Image Lightbox */}
      <ImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
