import type { YMapControlsProps } from '@yandex/ymaps3-types';
import { afterEach, expect, it, vi } from 'vitest';

import { createOpenMapsControl } from '../open-maps-control';

afterEach(() => vi.unstubAllGlobals());

it.each(['top right', 'bottom right'] as const)(
  'creates the native current-viewport control at %s after its module loads',
  async (position) => {
    const button = vi.fn(function (_props: { readonly title: string }) {});
    const controls = vi.fn(function (_props: YMapControlsProps, _children: readonly unknown[]) {});
    const imported = Promise.withResolvers<{ readonly YMapOpenMapsButton: typeof button }>();
    const importModule = vi.fn().mockReturnValue(imported.promise);
    vi.stubGlobal('ymaps3', { import: importModule, YMapControls: controls });

    const pending = createOpenMapsControl(window.ymaps3!, position);
    expect(importModule).toHaveBeenCalledWith('@yandex/ymaps3-controls-extra');
    expect(controls).not.toHaveBeenCalled();
    imported.resolve({ YMapOpenMapsButton: button });
    const control = await pending;

    expect(button.mock.calls).toMatchInlineSnapshot(`
      [
        [
          {
            "title": "Яндекс Карты",
          },
        ],
      ]
    `);
    expect(controls).toHaveBeenCalledWith({ position }, [button.mock.instances[0]]);
    expect(control).toBe(controls.mock.instances[0]);

    const failure = new Error('Control import failed');
    importModule.mockRejectedValueOnce(failure);
    await expect(createOpenMapsControl(window.ymaps3!, position)).rejects.toBe(failure);
    expect(controls).toHaveBeenCalledOnce();
    await createOpenMapsControl(window.ymaps3!, position);
    expect(controls).toHaveBeenCalledTimes(2);
  }
);
