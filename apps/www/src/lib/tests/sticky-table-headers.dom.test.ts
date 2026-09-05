import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installStickyTableHeaders } from '../sticky-table-headers';

let animationFrameId = 0;
let animationFrames = new Map<number, FrameRequestCallback>();
let uninstall: (() => void) | undefined;

const renderStickyTable = (getShellTop: () => number): HTMLElement => {
  document.body.innerHTML = `
    <div data-ui-sticky-table-shell>
      <table><thead><tr><th style="top: 0">Heading</th></tr></thead></table>
    </div>
  `;
  const shell = document.querySelector<HTMLElement>(
    '[data-ui-sticky-table-shell]',
  );
  const header = shell?.querySelector<HTMLElement>('thead th');
  if (!shell || !header) {
    throw new Error('Expected sticky table fixture');
  }

  vi.spyOn(shell, 'getBoundingClientRect').mockImplementation(() =>
    DOMRect.fromRect({ x: 0, y: getShellTop(), width: 320, height: 400 }),
  );
  vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 320, height: 40 }),
  );

  return shell;
};

const flushAnimationFrames = (): void => {
  const pendingFrames = animationFrames;

  animationFrames = new Map();
  pendingFrames.forEach((callback) => callback(performance.now()));
};

beforeEach(() => {
  animationFrameId = 0;
  animationFrames = new Map();
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      const id = ++animationFrameId;

      animationFrames.set(id, callback);
      return id;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => animationFrames.delete(id)),
  );
});

afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sticky table header lifecycle', () => {
  it('sets the initial and swapped sticky state synchronously', () => {
    const initialShell = renderStickyTable(() => -20);

    uninstall = installStickyTableHeaders();

    expect(initialShell.hasAttribute('data-ui-sticky-table-stuck')).toBe(true);
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    const swappedShell = renderStickyTable(() => -30);
    document.dispatchEvent(new Event('astro:after-swap'));

    expect(swappedShell.hasAttribute('data-ui-sticky-table-stuck')).toBe(true);
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    document.dispatchEvent(new Event('astro:page-load'));
    expect(swappedShell.hasAttribute('data-ui-sticky-table-stuck')).toBe(true);
  });

  it('does no scroll or resize work away from sticky tables and reactivates once', () => {
    let shellTop = 20;
    const shell = renderStickyTable(() => shellTop);
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');

    uninstall = installStickyTableHeaders();
    expect(shell.hasAttribute('data-ui-sticky-table-stuck')).toBe(false);

    shellTop = -20;
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));

    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(shell.hasAttribute('data-ui-sticky-table-stuck')).toBe(false);
    flushAnimationFrames();
    expect(shell.hasAttribute('data-ui-sticky-table-stuck')).toBe(true);

    window.dispatchEvent(new Event('scroll'));

    document.body.innerHTML = '';
    document.dispatchEvent(new Event('astro:after-swap'));
    expect(cancelAnimationFrame).toHaveBeenCalledOnce();
    const scrollListener = addEventListener.mock.calls.find(
      ([type]) => type === 'scroll',
    )?.[1];
    const resizeListener = addEventListener.mock.calls.find(
      ([type]) => type === 'resize',
    )?.[1];
    if (!scrollListener || !resizeListener) {
      throw new Error('Expected sticky table window listeners');
    }
    expect(removeEventListener).toHaveBeenCalledWith('scroll', scrollListener);
    expect(removeEventListener).toHaveBeenCalledWith('resize', resizeListener);

    vi.mocked(requestAnimationFrame).mockClear();
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    let returnedShellTop = 20;
    const returnedShell = renderStickyTable(() => returnedShellTop);
    document.dispatchEvent(new Event('astro:after-swap'));
    expect(returnedShell.hasAttribute('data-ui-sticky-table-stuck')).toBe(
      false,
    );

    installStickyTableHeaders();
    returnedShellTop = -30;
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    expect(requestAnimationFrame).toHaveBeenCalledOnce();

    flushAnimationFrames();
    expect(returnedShell.hasAttribute('data-ui-sticky-table-stuck')).toBe(true);
    expect(
      addEventListener.mock.calls
        .filter(([type]) => type === 'scroll' || type === 'resize')
        .map(([type]) => type),
    ).toMatchInlineSnapshot(`
      [
        "scroll",
        "resize",
        "scroll",
        "resize",
      ]
    `);
  });
});
