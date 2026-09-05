const tableShellSelector = '[data-ui-sticky-table-shell]';

let uninstallStickyTableHeaders: (() => void) | undefined;

const isTableHeaderStuck = (
  shell: HTMLElement,
  headerCell: HTMLElement,
): boolean => {
  const top = Number.parseFloat(getComputedStyle(headerCell).top) || 0;
  const shellRect = shell.getBoundingClientRect();
  const headerHeight = headerCell.getBoundingClientRect().height;

  return shellRect.top < top && shellRect.bottom > top + headerHeight;
};

const updateStickyTableHeaders = (shells: readonly HTMLElement[]): void => {
  shells.forEach((shell) => {
    const headerCell = shell.querySelector<HTMLElement>('thead th');

    if (!headerCell) {
      shell.removeAttribute('data-ui-sticky-table-stuck');
      return;
    }

    shell.toggleAttribute(
      'data-ui-sticky-table-stuck',
      isTableHeaderStuck(shell, headerCell),
    );
  });
};

export const installStickyTableHeaders = (): (() => void) => {
  if (uninstallStickyTableHeaders) {
    return uninstallStickyTableHeaders;
  }

  let shells: readonly HTMLElement[] = [];
  let animationFrame = 0;
  let windowListenersBound = false;

  const scheduleUpdate = (): void => {
    if (animationFrame) return;

    animationFrame = requestAnimationFrame(() => {
      animationFrame = 0;
      updateStickyTableHeaders(shells);
    });
  };

  const unbindWindowListeners = (): void => {
    if (!windowListenersBound) return;

    window.removeEventListener('scroll', scheduleUpdate);
    window.removeEventListener('resize', scheduleUpdate);
    windowListenersBound = false;
  };

  const cancelScheduledUpdate = (): void => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  };

  const deactivate = (): void => {
    cancelScheduledUpdate();

    shells = [];
    unbindWindowListeners();
  };

  const hydrate = (): void => {
    cancelScheduledUpdate();

    shells = Array.from(
      document.querySelectorAll<HTMLElement>(tableShellSelector),
    );
    if (shells.length === 0) {
      deactivate();
      return;
    }

    if (!windowListenersBound) {
      window.addEventListener('scroll', scheduleUpdate, { passive: true });
      window.addEventListener('resize', scheduleUpdate);
      windowListenersBound = true;
    }

    updateStickyTableHeaders(shells);
  };

  const uninstall = (): void => {
    document.removeEventListener('astro:after-swap', hydrate);
    document.removeEventListener('astro:page-load', hydrate);
    deactivate();
    if (uninstallStickyTableHeaders === uninstall) {
      uninstallStickyTableHeaders = undefined;
    }
  };

  uninstallStickyTableHeaders = uninstall;
  document.addEventListener('astro:after-swap', hydrate);
  document.addEventListener('astro:page-load', hydrate);
  hydrate();

  return uninstall;
};
