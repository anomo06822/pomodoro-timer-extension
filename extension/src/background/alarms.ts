interface SchedulePayload {
  sessionType: 'Focus' | 'ShortBreak' | 'LongBreak';
  durationMinutes: number;
}

const ALARM_BASE = 'pomodoro';

export const scheduleTimer = ({ sessionType, durationMinutes }: SchedulePayload) => {
  chrome.alarms.create(`${ALARM_BASE}:${sessionType}`, {
    delayInMinutes: Math.max(0.05, durationMinutes),
  });
};

export const stopTimer = () => {
  chrome.alarms.clearAll();
};
