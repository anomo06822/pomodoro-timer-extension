const AUDIO_URL = chrome.runtime.getURL('sounds/notify.wav');

const playSound = async () => {
  try {
    const audio = new Audio(AUDIO_URL);
    await audio.play();
  } catch (error) {
    console.warn('Unable to play audio', error);
  }
};

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'PLAY_ALERT_SOUND') {
    void playSound();
  }
});
