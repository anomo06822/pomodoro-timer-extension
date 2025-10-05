import React, { useMemo, useState } from 'react';
import './App.css';
import { useTheme } from '../shared/theme-context';
import type { SessionType } from '../shared/core';

type TimerStatus = 'idle' | 'running' | 'paused';

const SESSION_LABEL: Record<SessionType, string> = {
  Focus: 'Focus',
  ShortBreak: 'Short Break',
  LongBreak: 'Long Break',
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

const App: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [sessionType, setSessionType] = useState<SessionType>('Focus');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [remaining, setRemaining] = useState<number>(25 * 60);
  const [selectedTask, setSelectedTask] = useState<string>('');

  const statusLabel = useMemo(() => SESSION_LABEL[sessionType], [sessionType]);

  const handleStart = () => {
    setStatus('running');
    // TODO: connect with background timer service
  };

  const handlePause = () => {
    setStatus('paused');
  };

  const handleReset = () => {
    setStatus('idle');
    setRemaining(sessionType === 'Focus' ? 25 * 60 : sessionType === 'ShortBreak' ? 5 * 60 : 15 * 60);
  };

  const handleSkip = () => {
    const nextSession: SessionType = sessionType === 'Focus' ? 'ShortBreak' : 'Focus';
    setSessionType(nextSession);
    setRemaining(nextSession === 'Focus' ? 25 * 60 : nextSession === 'ShortBreak' ? 5 * 60 : 15 * 60);
    setStatus('idle');
  };

  const handleThemeChange = (value: 'system' | 'light' | 'dark') => {
    setTheme(value);
  };

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
          <button type="button" onClick={handleReset} className="control">
            Reset
          </button>
          <button type="button" onClick={handleSkip} className="control">
            Skip Break
          </button>
        </div>
        <section className="panel">
          <header className="panel-header">
            <h2>Current Task</h2>
            <button type="button" className="ghost-button">
              Manage tasks
            </button>
          </header>
          <select
            className="task-select"
            value={selectedTask}
            onChange={(event) => setSelectedTask(event.target.value)}
          >
            <option value="">No task selected</option>
            <option value="spec">Write product spec</option>
            <option value="review">Code review</option>
            <option value="study">Study algorithms</option>
          </select>
        </section>
        <section className="panel">
          <header className="panel-header">
            <h2>Today&apos;s Progress</h2>
            <button type="button" className="ghost-button">
              Export Markdown
            </button>
          </header>
          <ul className="stats-list">
            <li>
              <span>Total Pomodoros</span>
              <strong>0</strong>
            </li>
            <li>
              <span>Focus Minutes</span>
              <strong>0</strong>
            </li>
            <li>
              <span>Break Minutes</span>
              <strong>0</strong>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default App;
