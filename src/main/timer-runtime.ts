export const timerRuntime = {
  now: () => Date.now(),
  schedule: (callback: () => void, ms: number) => setTimeout(callback, ms),
  cancel: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
};

export type TimerRuntime = typeof timerRuntime;
