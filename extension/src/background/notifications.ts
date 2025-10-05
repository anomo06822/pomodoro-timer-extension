interface NotifyPayload {
  sessionType: string;
  settings: { requireInteraction: boolean; soundEnabled: boolean };
}

export const notifySessionComplete = async ({ sessionType, settings }: NotifyPayload) => {
  await chrome.notifications.create('', {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: 'Pomodoro complete',
    message: `${sessionType} session finished. Time for the next step!`,
    requireInteraction: settings.requireInteraction,
    priority: 2,
  });

  if (settings.soundEnabled && chrome.offscreen) {
    try {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
        justification: 'Play notification sound when a Pomodoro ends',
      });
    } catch (error) {
      console.warn('Unable to initialise offscreen document', error);
    }
  }
};
