import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installActiveVisitTracker } from '../active-visit';

const STORAGE_KEY = 'activity';
const START = new Date('2026-09-07T12:00:00Z');
const storage = new Map<string, string>();
const requestLock = vi.fn(
  async (_name: string, callback: () => void): Promise<void> => callback(),
);
let stops: Array<() => void> = [];

const setVisibility = (visibilityState: DocumentVisibilityState): void => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: visibilityState,
  });
};

const dispatchActivity = (type: string, trusted = true): void => {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'isTrusted', { value: trusted });
  document.dispatchEvent(event);
};

const install = (onGoal: () => void): void => {
  stops.push(installActiveVisitTracker(onGoal));
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  requestLock.mockClear();
  vi.stubGlobal('localStorage', {
    clear: () => storage.clear(),
    getItem: (key: string) => storage.get(key),
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal('navigator', { locks: { request: requestLock } });
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  setVisibility('visible');
  localStorage.clear();
});

afterEach(() => {
  for (const stop of stops) {
    stop();
  }
  stops = [];
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('active visit tracker', () => {
  it('sends one goal after 60 seconds of recent activity', () => {
    const onGoal = vi.fn();
    install(onGoal);

    dispatchActivity('pointerdown');
    vi.advanceTimersByTime(11_000);
    expect(onGoal).not.toHaveBeenCalled();

    for (let elapsed = 0; elapsed < 50_000; elapsed += 5_000) {
      dispatchActivity('pointermove');
      vi.advanceTimersByTime(5_000);
    }
    dispatchActivity('input');
    vi.advanceTimersByTime(20_000);

    expect(onGoal).toHaveBeenCalledOnce();
  });

  it('ignores synthetic events and time spent in a hidden document', () => {
    const onGoal = vi.fn();
    install(onGoal);

    dispatchActivity('pointermove', false);
    vi.advanceTimersByTime(60_000);
    dispatchActivity('keydown');
    vi.advanceTimersByTime(5_000);
    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(60_000);
    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(60_000);

    expect(onGoal).not.toHaveBeenCalled();
  });

  it('shares completed progress with a later tracker', () => {
    const firstGoal = vi.fn();
    const secondGoal = vi.fn();
    localStorage.setItem(STORAGE_KEY, `${Date.now()}|59000`);
    install(firstGoal);

    vi.advanceTimersByTime(1_000);
    install(secondGoal);
    dispatchActivity('wheel');
    vi.advanceTimersByTime(20_000);

    expect(firstGoal).toHaveBeenCalledOnce();
    expect(secondGoal).not.toHaveBeenCalled();
  });

  it('discards progress after 30 minutes without activity', () => {
    const onGoal = vi.fn();
    const expiredAt = Date.now() - 30 * 60_000;
    localStorage.setItem(STORAGE_KEY, `${expiredAt}|59000`);
    install(onGoal);

    dispatchActivity('pointerdown');
    vi.advanceTimersByTime(1_000);

    expect(onGoal).not.toHaveBeenCalled();
  });

  it('does not repeat the goal when storage becomes unavailable', () => {
    const onGoal = vi.fn();
    localStorage.setItem(STORAGE_KEY, `${Date.now()}|59000`);
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    install(onGoal);

    vi.advanceTimersByTime(20_000);

    expect(onGoal).toHaveBeenCalledOnce();
  });
});
