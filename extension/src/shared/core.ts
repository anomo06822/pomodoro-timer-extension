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
