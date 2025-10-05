import React, { useEffect, useState } from 'react';
import './OptionsApp.css';
import { DEFAULT_SETTINGS, type Settings } from '../shared/core';
import { useTheme } from '../shared/theme-context';

const getStorage = () => (typeof chrome !== 'undefined' ? chrome.storage : undefined);

const OptionsApp: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const storage = getStorage()?.local;
    if (!storage) {
      return;
    }

    storage.get(['settings'], (result) => {
      const stored = result?.settings as Partial<Settings> | undefined;
      if (stored) {
        setSettings((prev) => ({ ...prev, ...stored }));
      }
    });
  }, []);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev: Settings) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const storage = getStorage()?.local;
    if (!storage) {
      setStatusMessage('Unable to save settings');
      setIsSaving(false);
      return;
    }

    storage.set({ settings }, () => {
      setIsSaving(false);
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        setStatusMessage('Unable to save settings');
        return;
      }

      setStatusMessage('Settings saved');
      setTheme(settings.theme);
      window.setTimeout(() => setStatusMessage(''), 3000);
    });
  };

  return (
    <div className="options-root">
      <header>
        <h1>Pomodoro Pilot Settings</h1>
        <p>Configure session lengths, notifications, and appearance.</p>
      </header>
      <section className="card">
        <h2>Durations</h2>
        <div className="grid">
          <label>
            Focus (minutes)
            <input
              type="number"
              min={1}
              value={settings.focusMin}
              onChange={(event) => updateSetting('focusMin', Number(event.target.value))}
            />
          </label>
          <label>
            Short Break
            <input
              type="number"
              min={1}
              value={settings.shortBreakMin}
              onChange={(event) => updateSetting('shortBreakMin', Number(event.target.value))}
            />
          </label>
          <label>
            Long Break
            <input
              type="number"
              min={1}
              value={settings.longBreakMin}
              onChange={(event) => updateSetting('longBreakMin', Number(event.target.value))}
            />
          </label>
        </div>
      </section>
      <section className="card">
        <h2>Notifications</h2>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.autoStartNext}
            onChange={(event) => updateSetting('autoStartNext', event.target.checked)}
          />
          Auto start next session
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.requireInteraction}
            onChange={(event) => updateSetting('requireInteraction', event.target.checked)}
          />
          Require user action to dismiss notifications
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(event) => updateSetting('soundEnabled', event.target.checked)}
          />
          Play alert sound
        </label>
      </section>
      <section className="card">
        <h2>Theme</h2>
        <select value={settings.theme} onChange={(event) => updateSetting('theme', event.target.value as Settings['theme'])}>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <p className="hint">Current preference: {theme}</p>
      </section>
      <footer>
        <button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
        {statusMessage && <span className="status">{statusMessage}</span>}
      </footer>
    </div>
  );
};

export default OptionsApp;
