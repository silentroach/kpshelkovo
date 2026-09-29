// @vitest-environment happy-dom
import type { LngLatBounds, YMap, YMapFeatureProps } from '@yandex/ymaps3-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createParcelLayer } from '../parcel-layer';
import type { ParcelMapItem } from '../parcel-layer-types';

const bounds: LngLatBounds = [
  [37, 55],
  [38, 56]
];
const parcel: ParcelMapItem = {
  code: 'SHR-L43',
  aliases: ['SHR-L44'],
  part: 'shr',
  status: 'available',
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [37.1, 55.1],
          [37.2, 55.1],
          [37.1, 55.2],
          [37.1, 55.1]
        ]
      ],
      [
        [
          [37.3, 55.3],
          [37.4, 55.3],
          [37.3, 55.4],
          [37.3, 55.3]
        ]
      ]
    ]
  },
  labelCoordinates: [37.2, 55.2]
};

describe('parcel layer selection', () => {
  const features: Array<{
    readonly props: YMapFeatureProps;
    readonly update: ReturnType<typeof vi.fn>;
  }> = [];
  const labels: HTMLButtonElement[] = [];
  const map = {
    zoom: 17,
    bounds,
    addChild: vi.fn(),
    removeChild: vi.fn(),
    update: vi.fn()
  };
  const onSelectionChange = vi.fn();

  beforeEach(() => {
    features.length = 0;
    labels.length = 0;
    vi.clearAllMocks();
    for (const [name, color] of [
      ['--color-accent', '#d6a22a'],
      ['--parcel-map-boundary', '#64748b'],
      ['--parcel-map-selection', '#365f7d']
    ])
      document.documentElement.style.setProperty(name, color);
    Object.defineProperty(window, 'ymaps3', {
      configurable: true,
      value: {
        YMapFeature: class {
          update = vi.fn();
          constructor(props: YMapFeatureProps) {
            features.push({ props, update: this.update });
          }
        },
        YMapMarker: class {
          constructor(_props: object, element: HTMLButtonElement) {
            labels.push(element);
          }
        }
      }
    });
  });

  const layer = () => {
    const sdk = window.ymaps3;
    if (!sdk) throw new Error('Map SDK missing');
    return createParcelLayer(
      map as Partial<YMap> as YMap,
      sdk,
      document.createElement('div'),
      onSelectionChange,
      () => 0
    );
  };

  it.each(['available', 'reserved', 'unavailable', 'sold', undefined] as const)(
    'keeps the %s selection past five seconds until explicitly cleared',
    (status) => {
      vi.useFakeTimers();
      try {
        const instance = layer();
        const item = { ...parcel, status };
        instance.enable('shr', [item]);
        features[0]?.props.onClick?.({} as never, {} as never);
        expect(onSelectionChange).toHaveBeenLastCalledWith(item, undefined);
        vi.advanceTimersByTime(6_000);
        expect(features[0]?.update).toHaveBeenCalledTimes(1);
        expect(onSelectionChange).toHaveBeenCalledTimes(1);

        instance.clearSelection();
        expect(onSelectionChange).toHaveBeenLastCalledWith();
        expect(features[0]?.update.mock.lastCall?.[0].style).toMatchObject({
          fillOpacity:
            status === 'unavailable'
              ? 0.25
              : status === 'available' || status === 'reserved'
                ? 0.22
                : 0,
          stroke: [{ width: 1 }]
        });
        instance.destroy();
      } finally {
        vi.useRealTimers();
      }
    }
  );

  it('replaces a selected parcel atomically and notifies again on repeated selection', () => {
    const instance = layer();
    const other: ParcelMapItem = { ...parcel, code: 'SHR-L45', status: 'reserved' };
    instance.enable('shr', [parcel, other]);
    features[0]?.props.onClick?.({} as never, {} as never);
    features[1]?.props.onClick?.({} as never, {} as never);
    features[1]?.props.onClick?.({} as never, {} as never);

    expect(onSelectionChange.mock.calls).toEqual([
      [parcel, undefined],
      [other, undefined],
      [other, undefined]
    ]);
    expect(features[0]?.update.mock.lastCall?.[0].style).toMatchObject({ stroke: [{ width: 1 }] });
    instance.disable('shr');
    expect(onSelectionChange).toHaveBeenLastCalledWith();
    instance.destroy();
  });

  it('passes the label only for keyboard activation, not pointer or URL focus', () => {
    const instance = layer();
    instance.enable('shr', [parcel]);
    const button = labels[0];
    if (!button) throw new Error('Parcel label missing');
    button.dispatchEvent(new MouseEvent('click', { detail: 1 }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(parcel, undefined);
    button.dispatchEvent(new MouseEvent('click', { detail: 0 }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(parcel, button);
    expect(instance.focus('SHR-L44')).toBe(true);
    expect(onSelectionChange).toHaveBeenLastCalledWith(parcel, undefined);
    instance.destroy();
  });

  it('suppresses notifications for rollback and destruction', () => {
    const instance = layer();
    instance.enable('shr', [parcel]);
    features[0]?.props.onClick?.({} as never, {} as never);
    instance.disable('shr', false);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    instance.enable('shr', [parcel]);
    features[1]?.props.onClick?.({} as never, {} as never);
    instance.destroy();
    instance.clearSelection();
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
  });
});
