import { DEFAULT_SETTINGS, type Settings } from '../shared/core';

const SETTINGS_KEY = 'settings';

export const getSettings = async (): Promise<Settings> => {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] as Partial<Settings> | undefined) };
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
};
