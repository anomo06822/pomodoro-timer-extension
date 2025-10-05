export type SessionType = 'Focus' | 'ShortBreak' | 'LongBreak';

export interface Task {
  id: string;
  title: string;
  categoryId?: string;
  createdAt: string;
  completed?: boolean;
  notes?: string;
  totalPomos: number;
  todayPomos: number;
  totalFocusSeconds: number;
  todayFocusSeconds: number;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  order?: number;
}

export interface SessionRecord {
  id: string;
  taskId?: string;
  type: SessionType;
  startAt: string;
  endAt: string;
  durationSec: number;
  completed: boolean;
}

export interface Settings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  autoStartNext: boolean;
  requireInteraction: boolean;
  soundEnabled: boolean;
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  autoStartNext: false,
  requireInteraction: true,
  soundEnabled: true,
  theme: 'system',
};

export interface ActiveSession {
  sessionType: SessionType;
  taskId?: string;
  durationSeconds: number;
  startedAt: number;
}

export interface CompletedSession {
  sessionType: SessionType;
  taskId?: string;
  durationSeconds: number;
  completedAt: number;
}

export const createTask = (title: string): Task => ({
  id: globalThis.crypto?.randomUUID?.() ?? `task-${Math.random().toString(36).slice(2, 9)}`,
  title,
  createdAt: new Date().toISOString(),
  totalPomos: 0,
  todayPomos: 0,
  totalFocusSeconds: 0,
  todayFocusSeconds: 0,
});

export interface Metrics {
  focusSeconds: number;
  breakSeconds: number;
  totalPomodoros: number;
}

export const DEFAULT_METRICS: Metrics = {
  focusSeconds: 0,
  breakSeconds: 0,
  totalPomodoros: 0,
};
