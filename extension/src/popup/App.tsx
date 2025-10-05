import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { useTheme } from '../shared/theme-context';
import {
  DEFAULT_METRICS,
  DEFAULT_SETTINGS,
  createTask,
  type CompletedSession,
  type Metrics,
  type Settings,
  type SessionType,
  type Task,
} from '../shared/core';

type TimerStatus = 'idle' | 'running' | 'paused';

const SESSION_LABEL: Record<SessionType, string> = {
  Focus: 'Focus',
  ShortBreak: 'Short Break',
  LongBreak: 'Long Break',
};

const getNextSession = (session: SessionType): SessionType => {
  if (session === 'Focus') {
    return 'ShortBreak';
  }
  if (session === 'ShortBreak') {
    return 'Focus';
  }
  return 'Focus';
};

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const normalizeTask = (task: Task | (Partial<Task> & { id: string; title: string })): Task => ({
  id: task.id,
  title: task.title,
  categoryId: task.categoryId,
  createdAt: task.createdAt ?? new Date().toISOString(),
  completed: task.completed ?? false,
  notes: task.notes,
  totalPomos: task.totalPomos ?? 0,
  todayPomos: task.todayPomos ?? 0,
  totalFocusSeconds: task.totalFocusSeconds ?? 0,
  todayFocusSeconds: task.todayFocusSeconds ?? 0,
});

const getRuntime = () => (typeof chrome !== 'undefined' ? chrome.runtime : undefined);
const getStorage = () => (typeof chrome !== 'undefined' ? chrome.storage : undefined);

const callBackground = <T = unknown>(message: unknown): Promise<T> =>
  new Promise((resolve, reject) => {
    const runtime = getRuntime();
    if (!runtime?.sendMessage) {
      reject(new Error('Runtime unavailable'));
      return;
    }

    runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response as T);
    });
  });

const fireBackground = (message: unknown) => {
  callBackground(message).catch((error) => console.warn('Background message failed', error));
};

const App: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sessionType, setSessionType] = useState<SessionType>('Focus');
  const durations = useMemo(
    () => ({
      Focus: settings.focusMin * 60,
      ShortBreak: settings.shortBreakMin * 60,
      LongBreak: settings.longBreakMin * 60,
    }),
    [settings],
  );
  const durationsRef = useRef(durations);
  useEffect(() => {
    durationsRef.current = durations;
  }, [durations]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [status, setStatus] = useState<TimerStatus>('idle');
  const [remaining, setRemaining] = useState<number>(DEFAULT_SETTINGS.focusMin * 60);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(DEFAULT_METRICS);
  const [exportFeedback, setExportFeedback] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const lastSessionRef = useRef<number>(0);

  const statusLabel = useMemo(() => SESSION_LABEL[sessionType], [sessionType]);

  const startTimer = useCallback(
    (type: SessionType, options?: { durationSeconds?: number }) => {
      const durationSeconds = options?.durationSeconds ?? durationsRef.current[type];
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        console.warn('Invalid session duration', durationSeconds);
        return;
      }

      setSessionType(type);
      setRemaining(durationSeconds);

      callBackground({
        type: 'START_TIMER',
        payload: {
          sessionType: type,
          durationMinutes: durationSeconds / 60,
          taskId: selectedTask || null,
        },
      })
        .then(() => {
          setStatus('running');
        })
        .catch((error: Error) => {
          console.warn('Unable to start timer', error);
          setStatus('idle');
          setRemaining(durationSeconds);
        });
    },
    [selectedTask],
  );

  const handleSessionCompleted = useCallback(
    (session: CompletedSession) => {
      const nextSession = getNextSession(session.sessionType);
      setStatus('idle');
      setSessionType(nextSession);

      if (settingsRef.current.autoStartNext) {
        setTimeout(() => {
          startTimer(nextSession);
        }, 250);
      }
    },
    [startTimer],
  );

  useEffect(() => {
    const storage = getStorage()?.local;
    if (!storage) {
      return;
    }

    storage.get(['settings', 'tasks', 'selectedTask', 'metrics'], (result) => {
      const storedSettings = result.settings as Partial<Settings> | undefined;
      if (storedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...storedSettings });
      }

      if (Array.isArray(result.tasks)) {
        setTasks((result.tasks as Task[]).map((task) => normalizeTask(task)));
      }

      if (typeof result.selectedTask === 'string') {
        setSelectedTask(result.selectedTask ?? '');
      }

      const storedMetrics = result.metrics as Partial<Metrics> | undefined;
      if (storedMetrics) {
        setMetrics({
          focusSeconds: storedMetrics.focusSeconds ?? 0,
          breakSeconds: storedMetrics.breakSeconds ?? 0,
          totalPomodoros: storedMetrics.totalPomodoros ?? 0,
        });
      }
    });
  }, []);

  useEffect(() => {
    const storage = getStorage();
    if (!storage?.onChanged) {
      return;
    }

    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== 'local') {
        return;
      }

      if (changes.settings) {
        const next = { ...DEFAULT_SETTINGS, ...(changes.settings.newValue as Partial<Settings>) };
        setSettings(next);
      }

      if (changes.tasks && Array.isArray(changes.tasks.newValue)) {
        setTasks((changes.tasks.newValue as Task[]).map((task) => normalizeTask(task)));
      }

      if (changes.metrics?.newValue) {
        const nextMetrics = changes.metrics.newValue as Partial<Metrics>;
        setMetrics({
          focusSeconds: nextMetrics.focusSeconds ?? 0,
          breakSeconds: nextMetrics.breakSeconds ?? 0,
          totalPomodoros: nextMetrics.totalPomodoros ?? 0,
        });
      }

      if (changes.selectedTask) {
        setSelectedTask((changes.selectedTask.newValue as string) ?? '');
      }

      if (changes.lastSession?.newValue) {
        const session = changes.lastSession.newValue as CompletedSession;
        if (session.completedAt && session.completedAt > lastSessionRef.current) {
          lastSessionRef.current = session.completedAt;
          handleSessionCompleted(session);
        }
      }
    };

    storage.onChanged.addListener(listener);
    return () => storage.onChanged.removeListener(listener);
  }, [handleSessionCompleted]);

  useEffect(() => {
    if (!exportFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setExportFeedback('');
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [exportFeedback]);

  useEffect(() => {
    if (status !== 'running') {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setStatus('idle');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    if (status === 'idle') {
      setRemaining(durations[sessionType]);
    }
  }, [durations, sessionType, status]);

  useEffect(() => {
    const storage = getStorage()?.local;
    if (!storage) {
      return;
    }
    storage.set({ selectedTask });
  }, [selectedTask]);

  useEffect(() => {
    if (selectedTask && !tasks.find((task) => task.id === selectedTask)) {
      setSelectedTask('');
    }
  }, [selectedTask, tasks]);

  const handleStart = () => {
    if (status === 'running') {
      return;
    }

    if (sessionType === 'Focus' && !selectedTask) {
      setExportFeedback('Select a task before starting a focus session.');
      return;
    }

    const durationSeconds = status === 'paused' ? remaining : durations[sessionType];
    startTimer(sessionType, { durationSeconds });
  };

  const handlePause = () => {
    if (status !== 'running') {
      return;
    }

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setStatus('paused');
    fireBackground({ type: 'STOP_TIMER' });
  };

  const handleReset = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setStatus('idle');
    setRemaining(durations[sessionType]);
    fireBackground({ type: 'STOP_TIMER' });
  };

  const handleSkip = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    fireBackground({ type: 'STOP_TIMER' });
    const nextSession = getNextSession(sessionType);
    setStatus('idle');
    setSessionType(nextSession);
  };

  const handleCompleteEarly = () => {
    if (status !== 'running') {
      return;
    }

    const planned = durationsRef.current[sessionType];
    const elapsed = Math.max(1, planned - remaining);
    callBackground({ type: 'COMPLETE_SESSION', payload: { elapsedSeconds: elapsed } }).catch((error: Error) => {
      setExportFeedback(`Complete failed: ${error.message}`);
    });

    setStatus('idle');
    setRemaining(0);
  };

  const handleThemeChange = (value: 'system' | 'light' | 'dark') => {
    setTheme(value);
  };

  const handleOpenSettings = () => {
    if (chrome?.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
      return;
    }

    window.open('options.html', '_blank', 'noopener');
  };

  const handleManageTasks = () => {
    const title = window.prompt('Add a task (leave blank to cancel)');
    if (!title) {
      return;
    }

    const newTask = createTask(title.trim());
    const nextTasks = [...tasks, newTask];
    setTasks(nextTasks);
    setSelectedTask(newTask.id);
    const storage = getStorage()?.local;
    storage?.set({ tasks: nextTasks, selectedTask: newTask.id });
  };

  const handleTaskChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    const value = event.target.value;
    setSelectedTask(value);
    const storage = getStorage()?.local;
    storage?.set({ selectedTask: value });
  };

  const handleExportMarkdown = () => {
    if (isExporting) {
      return;
    }

    const runtime = getRuntime();
    if (!runtime?.sendMessage) {
      setExportFeedback('Unable to reach background script.');
      return;
    }

    setIsExporting(true);
    setExportFeedback('Generating Markdown report...');

    runtime.sendMessage({ type: 'EXPORT_MARKDOWN' }, (response) => {
      setIsExporting(false);

      if (chrome.runtime.lastError) {
        setExportFeedback(`Export failed: ${chrome.runtime.lastError.message}`);
        return;
      }

      if (response?.ok) {
        setExportFeedback('Markdown report ready in your downloads.');
        return;
      }

      setExportFeedback(`Export failed: ${response?.error ?? 'Unknown error'}`);
    });
  };

  const stats = useMemo(
    () => ({
      totalPomodoros: metrics.totalPomodoros,
      focusMinutes: Math.round(metrics.focusSeconds / 60),
      breakMinutes: Math.round(metrics.breakSeconds / 60),
    }),
    [metrics],
  );

  const selectedTaskDetails = useMemo(
    () => tasks.find((task) => task.id === selectedTask),
    [selectedTask, tasks],
  );

  return (
    <div className="popup-root">
      <header className={`timer-header timer-header--${sessionType.toLowerCase()}`}>
        <div>
          <h1 className="timer-title">Pomodoro Pilot</h1>
          <p className="timer-subtitle">{statusLabel}</p>
        </div>
        <div className="theme-toggle">
          <label htmlFor="theme-select">Theme</label>
          <select
            id="theme-select"
            value={theme}
            onChange={(event) => handleThemeChange(event.target.value as 'system' | 'light' | 'dark')}
            aria-label="Select theme"
          >
            <option value="system">System ({resolvedTheme})</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <button type="button" className="ghost-button" onClick={handleOpenSettings}>
            Settings
          </button>
        </div>
      </header>
      <main className="timer-main">
        <div className="timer-display" role="status" aria-live="polite">
          <span className="timer-time">{formatTime(remaining)}</span>
          <span className="timer-status">{status.toUpperCase()}</span>
        </div>
        <div className="timer-controls">
          <button type="button" onClick={handleStart} className="control control-primary">
            Start
          </button>
          <button type="button" onClick={handlePause} className="control">
            Pause
          </button>
          <button type="button" onClick={handleCompleteEarly} className="control">
            Finish session
          </button>
          <button type="button" onClick={handleReset} className="control">
            Reset
          </button>
          <button type="button" onClick={handleSkip} className="control">
            Next session
          </button>
        </div>
        <section className="panel">
          <header className="panel-header">
            <h2>Current Task</h2>
            <button type="button" className="ghost-button" onClick={handleManageTasks}>
              Manage tasks
            </button>
          </header>
          <select className="task-select" value={selectedTask} onChange={handleTaskChange}>
            <option value="">No task selected</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          {selectedTaskDetails && (
            <p className="hint">
              {selectedTaskDetails.totalPomos} pomodoros ·
              {' '}
              {Math.round(selectedTaskDetails.totalFocusSeconds / 60)} focus minutes
            </p>
          )}
        </section>
        <section className="panel">
          <header className="panel-header">
            <h2>Today&apos;s Progress</h2>
            <button
              type="button"
              className="ghost-button"
              onClick={handleExportMarkdown}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting…' : 'Export Markdown'}
            </button>
          </header>
          <ul className="stats-list">
            <li>
              <span>Total Pomodoros</span>
              <strong>{stats.totalPomodoros}</strong>
            </li>
            <li>
              <span>Focus Minutes</span>
              <strong>{stats.focusMinutes}</strong>
            </li>
            <li>
              <span>Break Minutes</span>
              <strong>{stats.breakMinutes}</strong>
            </li>
          </ul>
          {exportFeedback && <p className="hint" aria-live="polite">{exportFeedback}</p>}
        </section>
      </main>
    </div>
  );
};

export default App;
