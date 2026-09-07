const ACTIVE_GOAL_MS = 60_000;
const ACTIVITY_GRACE_MS = 10_000;
const TICK_MS = 1_000;
const VISIT_TIMEOUT_MS = 30 * 60_000;
const STORAGE_KEY = 'activity';
const ACTIVITY_EVENTS = [
  'input',
  'keydown',
  'pointerdown',
  'pointermove',
  'wheel',
] as const;

const progress = (
  lastActivityAt = 0,
  activeMs = 0,
): readonly [number, number] => [lastActivityAt, activeMs];

export const installActiveVisitTracker = (onGoal: () => void): (() => void) => {
  let memory = progress();
  let lastRecordedAt = 0;
  let lastTickAt = Date.now();
  let storageAvailable = true;

  const readProgress = (now: number) => {
    if (storageAvailable) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const [lastActivityAt, activeMs] = stored.split('|').map(Number);

          memory =
            Number.isFinite(lastActivityAt) &&
            lastActivityAt > 0 &&
            Number.isFinite(activeMs) &&
            activeMs >= 0 &&
            activeMs <= ACTIVE_GOAL_MS
              ? progress(lastActivityAt, activeMs)
              : progress();
        }
      } catch {
        storageAvailable = false;
      }
    }

    if (
      memory[0] > now ||
      (memory[0] > 0 && now - memory[0] >= VISIT_TIMEOUT_MS)
    ) {
      memory = progress();
    }

    return memory;
  };

  const writeProgress = (lastActivityAt: number, activeMs: number): void => {
    memory = progress(lastActivityAt, activeMs);

    if (!storageAvailable) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, memory.join('|'));
    } catch {
      storageAvailable = false;
    }
  };

  const isForeground = (): boolean =>
    document.visibilityState === 'visible' && document.hasFocus();

  const tick = (now = Date.now(), activityAt = 0): void => {
    const intervalStartedAt = lastTickAt;
    lastTickAt = now;

    if (!isForeground()) {
      return;
    }

    const update = (): void => {
      if (!isForeground()) {
        return;
      }

      const [lastActivityAt, activeMs] = readProgress(Date.now());
      const goalSent = activeMs >= ACTIVE_GOAL_MS;
      const creditedMs =
        lastActivityAt && !goalSent
          ? Math.max(
              0,
              Math.min(now, lastActivityAt + ACTIVITY_GRACE_MS) -
                Math.max(intervalStartedAt, lastActivityAt),
            )
          : 0;
      const nextActiveMs = Math.min(ACTIVE_GOAL_MS, activeMs + creditedMs);
      const reachedGoal = !goalSent && nextActiveMs >= ACTIVE_GOAL_MS;
      const nextActivityAt = Math.max(lastActivityAt, activityAt);

      if (nextActivityAt !== lastActivityAt || nextActiveMs !== activeMs) {
        writeProgress(nextActivityAt, nextActiveMs);
      }

      if (reachedGoal) {
        onGoal();
      }
    };

    if (navigator.locks) {
      void navigator.locks.request(STORAGE_KEY, update);
    } else {
      update();
    }
  };

  const recordActivity = (event: Event): void => {
    if (!event.isTrusted || !isForeground()) {
      return;
    }

    const now = Date.now();
    const sinceLastRecord = now - lastRecordedAt;
    if (sinceLastRecord >= 0 && sinceLastRecord < TICK_MS) {
      return;
    }

    lastRecordedAt = now;
    tick(now, now);
  };

  const resetTick = (): void => {
    lastTickAt = Date.now();
  };

  const abortController = new AbortController();
  const listenerOptions = {
    capture: true,
    passive: true,
    signal: abortController.signal,
  };
  for (const event of ACTIVITY_EVENTS) {
    document.addEventListener(event, recordActivity, listenerOptions);
  }
  document.addEventListener('visibilitychange', resetTick, listenerOptions);
  window.addEventListener('blur', resetTick, listenerOptions);
  window.addEventListener('focus', resetTick, listenerOptions);
  const timer = window.setInterval(tick, TICK_MS);

  return () => {
    window.clearInterval(timer);
    abortController.abort();
  };
};
