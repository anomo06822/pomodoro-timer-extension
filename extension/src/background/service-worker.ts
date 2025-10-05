import { scheduleTimer, stopTimer } from './alarms';
import { notifySessionComplete } from './notifications';
import { getSettings } from './storage';
import {
  DEFAULT_METRICS,
  type ActiveSession,
  type CompletedSession,
  type Metrics,
  type SessionType,
  type Task,
} from '../shared/core';

const storageGet = <T extends string | string[]>(keys: T) =>
  new Promise<Record<string, unknown>>((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });

const storageSet = (items: Record<string, unknown>) =>
  new Promise<void>((resolve) => {
    chrome.storage.local.set(items, () => resolve());
  });

const exportMarkdownReport = async () => {
  const now = new Date();
  const dateStamp = now.toISOString().split('T')[0];
  const content = [`# Pomodoro Pilot Report`, `Generated: ${now.toLocaleString()}`, '', '- Completed sessions: 0', '- Focus minutes: 0', '- Break minutes: 0', ''].join('\n');
  const dataUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`;

  await new Promise<void>((resolve, reject) => {
    chrome.downloads.download(
      {
        url: dataUrl,
        filename: `pomodoro-report-${dateStamp}.md`,
        saveAs: true,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (downloadId === undefined || downloadId <= 0) {
          reject(new Error('Download was not started.'));
          return;
        }

        resolve();
      },
    );
  });
};

const normalizeTask = (task: Task): Task => ({
  ...task,
  totalFocusSeconds: task.totalFocusSeconds ?? 0,
  todayFocusSeconds: task.todayFocusSeconds ?? 0,
  totalPomos: task.totalPomos ?? 0,
  todayPomos: task.todayPomos ?? 0,
});

const finalizeSession = async (elapsedSeconds?: number) => {
  const result = await storageGet(['activeSession', 'tasks', 'metrics']);
  const activeSession = result.activeSession as ActiveSession | null | undefined;
  if (!activeSession) {
    return;
  }

  const tasks = Array.isArray(result.tasks) ? (result.tasks as Task[]) : [];
  const nextTasks = tasks.map((task) => normalizeTask(task));
  const durationSeconds = Math.max(1, Math.round(elapsedSeconds ?? activeSession.durationSeconds));
  const metricsValue = (result.metrics as Metrics | undefined) ?? DEFAULT_METRICS;
  const nextMetrics: Metrics = {
    focusSeconds: metricsValue.focusSeconds ?? 0,
    breakSeconds: metricsValue.breakSeconds ?? 0,
    totalPomodoros: metricsValue.totalPomodoros ?? 0,
  };

  if (activeSession.sessionType === 'Focus') {
    nextMetrics.focusSeconds += durationSeconds;
    nextMetrics.totalPomodoros += 1;

    if (activeSession.taskId) {
      const index = nextTasks.findIndex((task) => task.id === activeSession.taskId);
      if (index >= 0) {
        const existing = normalizeTask(nextTasks[index]);
        nextTasks[index] = {
          ...existing,
          totalPomos: existing.totalPomos + 1,
          todayPomos: existing.todayPomos + 1,
          totalFocusSeconds: existing.totalFocusSeconds + durationSeconds,
          todayFocusSeconds: existing.todayFocusSeconds + durationSeconds,
        };
      }
    }
  } else {
    nextMetrics.breakSeconds += durationSeconds;
  }

  await storageSet({
    tasks: nextTasks,
    metrics: nextMetrics,
    activeSession: null,
    lastSession: {
      sessionType: activeSession.sessionType,
      taskId: activeSession.taskId,
      durationSeconds,
      completedAt: Date.now(),
    } as CompletedSession,
  });
};

chrome.runtime.onInstalled.addListener(() => {
  console.log('Pomodoro Pilot background ready');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'START_TIMER') {
    const { sessionType, durationMinutes, taskId } = message.payload as {
      sessionType: SessionType;
      durationMinutes: number;
      taskId?: string | null;
    };

    scheduleTimer({ sessionType, durationMinutes });

    storageSet({
      activeSession: {
        sessionType,
        taskId: taskId ?? undefined,
        durationSeconds: Math.round(durationMinutes * 60),
        startedAt: Date.now(),
      } satisfies ActiveSession,
    }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === 'STOP_TIMER') {
    stopTimer();
    storageSet({ activeSession: null }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === 'COMPLETE_SESSION') {
    stopTimer();
    finalizeSession((message.payload?.elapsedSeconds as number | undefined) ?? undefined)
      .then(() => sendResponse({ ok: true }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }));

    return true;
  }

  if (message?.type === 'EXPORT_MARKDOWN') {
    exportMarkdownReport()
      .then(() => sendResponse({ ok: true }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }));

    return true;
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith('pomodoro:')) {
    return;
  }

  const settings = await getSettings();
  await notifySessionComplete({ sessionType: alarm.name.split(':')[1] ?? 'Focus', settings });
  await finalizeSession();
});
