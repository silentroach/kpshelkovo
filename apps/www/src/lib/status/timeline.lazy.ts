const STATUS_TIMELINE_SELECTOR = '[data-status-timeline]';
const STATUS_TIMELINE_PROBLEM_SELECTOR = '[data-status-problem]';
const STATUS_TIMELINE_INTENT_EVENTS = ['pointerover', 'focusin', 'touchstart'] as const;

type StatusTimelineDomModule = Pick<typeof import('./timeline.dom'), 'hydrateStatusTimelines'>;

type StatusTimelineDomLoader = () => Promise<StatusTimelineDomModule>;

const boundDocuments = new WeakSet<Document>();

const hasStatusTimelines = (rootDocument: Document): boolean =>
  Boolean(rootDocument.querySelector(STATUS_TIMELINE_SELECTOR));

const getStatusTimelineTrigger = (target: EventTarget | undefined): HTMLElement | undefined => {
  if (!(target instanceof Element)) {
    return undefined;
  }

  const trigger = target.closest(STATUS_TIMELINE_PROBLEM_SELECTOR);

  if (!(trigger instanceof HTMLElement)) {
    return undefined;
  }

  return trigger.closest(STATUS_TIMELINE_SELECTOR) ? trigger : undefined;
};

const replayStatusTimelineIntent = (
  trigger: HTMLElement,
  sourceEventType: string | undefined
): void => {
  if (!trigger.isConnected) {
    return;
  }

  if (sourceEventType === 'focusin') {
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    return;
  }

  if (sourceEventType === 'touchstart') {
    trigger.dispatchEvent(new Event('touchstart', { bubbles: true }));
    return;
  }

  trigger.dispatchEvent(new Event('mouseenter'));
};

export const bindStatusTimelineLazyHydration = (
  rootDocument: Document = document,
  loadStatusTimelineDom: StatusTimelineDomLoader = () => import('./timeline.dom')
): void => {
  if (boundDocuments.has(rootDocument)) {
    return;
  }

  boundDocuments.add(rootDocument);

  let domModulePromise: Promise<StatusTimelineDomModule> | undefined;
  let hydrationPromise: Promise<StatusTimelineDomModule | undefined> | undefined;
  let hasIntentListeners = false;
  let awaitingPageLoad = false;
  let pendingIntent: readonly [HTMLElement, string] | undefined;

  const removeIntentListeners = (): void => {
    if (!hasIntentListeners) {
      return;
    }

    STATUS_TIMELINE_INTENT_EVENTS.forEach((eventName) => {
      rootDocument.removeEventListener(eventName, handleIntent, true);
    });
    hasIntentListeners = false;
  };

  const addIntentListeners = (): void => {
    if (hasIntentListeners) {
      return;
    }

    STATUS_TIMELINE_INTENT_EVENTS.forEach((eventName) => {
      rootDocument.addEventListener(eventName, handleIntent, true);
    });
    hasIntentListeners = true;
  };

  const loadDomModule = async (): Promise<StatusTimelineDomModule | undefined> => {
    try {
      domModulePromise ??= loadStatusTimelineDom();
      return await domModulePromise;
    } catch {
      domModulePromise = undefined;
      bindOrHydrate();
      return;
    }
  };

  const hydrateLoadedTimelines = (): Promise<StatusTimelineDomModule | undefined> =>
    (hydrationPromise ??= (async () => {
      try {
        const domModule = await loadDomModule();
        if (hasStatusTimelines(rootDocument)) {
          domModule?.hydrateStatusTimelines(rootDocument);
        }
        return domModule;
      } finally {
        hydrationPromise = undefined;
      }
    })());

  const hydrateForIntent = (trigger: HTMLElement, eventType: string): void => {
    removeIntentListeners();
    void hydrateLoadedTimelines().then((domModule) => {
      if (domModule) {
        replayStatusTimelineIntent(trigger, eventType);
      }
    });
  };

  function handleIntent(event: Event): void {
    const trigger = getStatusTimelineTrigger(event.target || undefined);
    if (!trigger) {
      return;
    }
    if (awaitingPageLoad) {
      pendingIntent = [trigger, event.type];
      return;
    }
    hydrateForIntent(trigger, event.type);
  }

  function bindOrHydrate(): void {
    if (!hasStatusTimelines(rootDocument)) {
      removeIntentListeners();
      return;
    }

    if (domModulePromise) {
      removeIntentListeners();
      void hydrateLoadedTimelines();
      return;
    }

    addIntentListeners();
  }

  bindOrHydrate();
  rootDocument.addEventListener('astro:after-swap', () => {
    awaitingPageLoad = true;
    pendingIntent = undefined;
    if (hasStatusTimelines(rootDocument)) {
      addIntentListeners();
    } else {
      removeIntentListeners();
    }
  });
  rootDocument.addEventListener('astro:page-load', () => {
    awaitingPageLoad = false;
    const intent = pendingIntent;
    pendingIntent = undefined;
    if (intent) {
      hydrateForIntent(...intent);
    } else {
      bindOrHydrate();
    }
  });
};
