import { AppSettings, ChatSession } from '../types';
import { DEFAULT_SETTINGS } from './constants';

const SETTINGS_KEY = 'aether_ai_settings_v1';
const SESSIONS_KEY = 'aether_ai_sessions_v1';
const ACTIVE_SESSION_KEY = 'aether_ai_active_session_v1';

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      serviceFailover: parsed.serviceFailover ?? false,
      providers: {
        gemini: { ...DEFAULT_SETTINGS.providers.gemini, ...parsed.providers?.gemini },
        groq: { ...DEFAULT_SETTINGS.providers.groq, ...parsed.providers?.groq },
        openrouter: { ...DEFAULT_SETTINGS.providers.openrouter, ...parsed.providers?.openrouter },
      },
    };
  } catch (e) {
    console.error('Failed to load settings from localStorage', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
}

export function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load sessions from localStorage', e);
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions to localStorage', e);
  }
}

export function loadActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function saveActiveSessionId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

export function createNewSession(): ChatSession {
  const timestamp = Date.now();
  return {
    id: `sess_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
    title: 'New conversation',
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
  };
}
