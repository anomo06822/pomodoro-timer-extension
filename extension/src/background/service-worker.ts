import { scheduleTimer, stopTimer } from './alarms';
import { notifySessionComplete } from './notifications';
import { getSettings } from './storage';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Pomodoro Pilot background ready');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'START_TIMER') {
    scheduleTimer(message.payload);
    sendResponse({ ok: true });
  }
  if (message?.type === 'STOP_TIMER') {
    stopTimer();
    sendResponse({ ok: true });
  }
  return true;
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith('pomodoro:')) {
    return;
  }

  const settings = await getSettings();
  await notifySessionComplete({ sessionType: alarm.name.split(':')[1] ?? 'Focus', settings });
});
