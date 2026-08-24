import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import SettlementMap from './SettlementMap.svelte';

const mockMap = {
  addChild: vi.fn(),
  removeChild: vi.fn(),
  update: vi.fn(),
  destroy: vi.fn(),
};

const markers: HTMLElement[] = [];

const mockYandexMaps = {
  ready: Promise.resolve(),
  Map: vi.fn(function Map() {
    return mockMap;
  }),
  YMap: vi.fn(function YMap() {
    return mockMap;
  }),
  YMapDefaultSchemeLayer: vi.fn(function YMapDefaultSchemeLayer() {
    return {};
  }),
  YMapDefaultFeaturesLayer: vi.fn(function YMapDefaultFeaturesLayer() {
    return {};
  }),
  YMapMarker: vi.fn(function YMapMarker(_: unknown, el: HTMLElement) {
    markers.push(el);
    return { el, update: vi.fn() };
  }),
};

// Мок данных поселков.
const mockSettlements = [
  {
    slug: 'shelkovo',
    name: 'КП Шелково',
    shortName: 'Шелково',
    lat: 55.8234,
    lng: 37.1456,
    normalizedTariff: 120,
    isBaseline: true,
    companyText: 'ОК "Комфорт"',
  },
  {
    slug: 'lesnoe',
    name: 'КП Лесное',
    shortName: 'Лесное',
    lat: 55.85,
    lng: 37.2,
    normalizedTariff: 80,
    isBaseline: false,
    companyText: 'УК Лесное',
  },
  {
    slug: 'usadby',
    name: 'Усадьбы Истра',
    shortName: 'Усадьбы Истра',
    lat: 55.78,
    lng: 37.1,
    normalizedTariff: 150,
    isBaseline: false,
    companyText: 'УК Усадьбы',
  },
];

describe('SettlementMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markers.length = 0;
    document.head
      .querySelectorAll(
        '[data-yandex-maps-api="true"], [data-yandex-maps-test="true"]',
      )
      .forEach((node) => node.remove());

    Object.defineProperty(window, 'ymaps3', {
      value: mockYandexMaps,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.head
      .querySelectorAll(
        '[data-yandex-maps-api="true"], [data-yandex-maps-test="true"]',
      )
      .forEach((node) => node.remove());
    delete (window as { ymaps3?: unknown }).ymaps3;
  });

  it('renders map container', () => {
    const { container } = render(SettlementMap, {
      props: { settlements: mockSettlements },
    });

    const mapContainer = container.querySelector(
      '[data-testid="settlement-map"]',
    );
    expect(mapContainer).toBeTruthy();
  });

  it('displays loading state initially', () => {
    const { container } = render(SettlementMap, {
      props: { settlements: mockSettlements },
    });

    expect(container.textContent).toContain('Загрузка карты');
  });

  it('creates markers for all settlements when ymaps3 is available', async () => {
    render(SettlementMap, {
      props: { settlements: mockSettlements },
    });

    await waitFor(() => {
      expect(markers.length).toBe(mockSettlements.length);
    });
  });

  it('uses dynamic gradient for non-baseline markers', async () => {
    render(SettlementMap, {
      props: {
        settlements: [
          {
            slug: 'base',
            name: 'База',
            shortName: 'База',
            lat: 55.8,
            lng: 37.1,
            normalizedTariff: 640,
            isBaseline: true,
          },
          {
            slug: 'low',
            name: 'Низкий',
            shortName: 'Низкий',
            lat: 55.81,
            lng: 37.11,
            normalizedTariff: 495,
            isBaseline: false,
          },
          {
            slug: 'high',
            name: 'Высокий',
            shortName: 'Высокий',
            lat: 55.82,
            lng: 37.12,
            normalizedTariff: 815,
            isBaseline: false,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(markers.length).toBe(3);
    });

    expect(markers[0]?.style.background).toBe('#064b08');
    expect(markers[1]?.style.background).not.toBe(markers[2]?.style.background);
  });

  it('uses neutral color when all non-baseline tariffs are equal', async () => {
    render(SettlementMap, {
      props: {
        settlements: [
          {
            slug: 'base',
            name: 'База',
            shortName: 'База',
            lat: 55.8,
            lng: 37.1,
            normalizedTariff: 700,
            isBaseline: true,
          },
          {
            slug: 'same-1',
            name: 'Одинаковый 1',
            shortName: 'Одинаковый 1',
            lat: 55.81,
            lng: 37.11,
            normalizedTariff: 700,
            isBaseline: false,
          },
          {
            slug: 'same-2',
            name: 'Одинаковый 2',
            shortName: 'Одинаковый 2',
            lat: 55.82,
            lng: 37.12,
            normalizedTariff: 700,
            isBaseline: false,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(markers.length).toBe(3);
    });

    expect(markers[0]?.style.background).toBe('#064b08');
    expect(markers[1]?.style.background).toBe('#6a502e');
    expect(markers[2]?.style.background).toBe('#6a502e');
  });

  it('updates markers and recenters on settlements change', async () => {
    const { rerender } = render(SettlementMap, {
      props: { settlements: mockSettlements },
    });

    await waitFor(() => {
      expect(mockYandexMaps.YMapMarker).toHaveBeenCalledTimes(3);
    });

    await rerender({ settlements: [mockSettlements[0]] });

    await waitFor(() => {
      expect(mockYandexMaps.YMapMarker).toHaveBeenCalledTimes(3);
      expect(mockMap.removeChild).toHaveBeenCalledTimes(2);
      expect(mockMap.update).toHaveBeenCalled();
    });
  });

  it('resyncs after Astro client navigation finishes', async () => {
    render(SettlementMap, {
      props: { settlements: mockSettlements },
    });

    await waitFor(() => {
      expect(markers.length).toBe(mockSettlements.length);
    });

    mockMap.update.mockClear();
    document.dispatchEvent(new Event('astro:page-load'));

    await waitFor(() => {
      expect(mockMap.update).toHaveBeenCalled();
    });
  });

  it('preserves Yandex Maps styles without copying executed scripts', () => {
    render(SettlementMap, {
      props: { settlements: mockSettlements },
    });

    const script = document.createElement('script');
    script.dataset.yandexMapsApi = 'true';
    document.head.appendChild(script);

    const style = document.createElement('style');
    style.dataset.yandexMapsTest = 'true';
    style.textContent = '.ymaps3--map { display: block; }';
    document.head.appendChild(style);

    const newDocument = document.implementation.createHTMLDocument();
    const event = Object.assign(new Event('astro:before-swap'), {
      newDocument,
    });
    document.dispatchEvent(event);

    expect(newDocument.head.querySelector('script')).toBeNull();
    expect(newDocument.head.querySelector('style')?.textContent).toContain(
      'ymaps3--map',
    );
  });

  it('handles empty settlements array gracefully', () => {
    const { container } = render(SettlementMap, {
      props: { settlements: [] },
    });

    // Контейнер должен рендериться без падения.
    expect(
      container.querySelector('[data-testid="settlement-map"]'),
    ).toBeTruthy();
  });

  it('moves focus into a keyboard-opened popup and restores it on close', async () => {
    const { container } = render(SettlementMap, {
      props: { settlements: mockSettlements },
    });

    await waitFor(() => {
      expect(markers.length).toBe(mockSettlements.length);
    });

    const marker = markers[1];
    if (marker) container.append(marker);

    expect({
      ariaExpanded: marker?.getAttribute('aria-expanded'),
      ariaLabel: marker?.getAttribute('aria-label'),
      tabIndex: marker?.tabIndex,
      tagName: marker?.tagName,
      type: marker?.getAttribute('type'),
    }).toMatchInlineSnapshot(`
      {
        "ariaExpanded": "false",
        "ariaLabel": "Показать данные о поселке «КП Лесное»",
        "tabIndex": 0,
        "tagName": "BUTTON",
        "type": "button",
      }
    `);

    marker?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 0 }),
    );

    await waitFor(() => {
      expect(container.querySelector('[data-testid="map-popup"]')).toBeTruthy();
      expect(container.textContent).toContain('Лесное');
      expect(container.textContent).toContain('УК Лесное');
    });

    const link = container.querySelector<HTMLAnchorElement>(
      '[data-testid="map-popup-link"]',
    );
    expect(link?.getAttribute('href')).toContain('/settlements/lesnoe/');
    await waitFor(() => {
      expect(document.activeElement).toBe(link);
      expect(marker?.getAttribute('aria-expanded')).toBe('true');
    });

    container
      .querySelector<HTMLButtonElement>('button[aria-label="Закрыть попап"]')
      ?.click();

    await waitFor(() => {
      expect(document.activeElement).toBe(marker);
      expect(marker?.getAttribute('aria-expanded')).toBe('false');
    });
  });

  it('keeps non-interactive markers out of the accessibility tree', async () => {
    render(SettlementMap, {
      props: {
        settlements: [mockSettlements[0]],
        interactive: false,
        popup: false,
      },
    });

    await waitFor(() => {
      expect(markers.length).toBe(1);
    });

    const marker = markers[0];

    expect({
      ariaHidden: marker?.getAttribute('aria-hidden'),
      ariaLabel: marker?.getAttribute('aria-label') ?? undefined,
      tabIndex: marker?.tabIndex,
      tagName: marker?.tagName,
    }).toMatchInlineSnapshot(`
      {
        "ariaHidden": "true",
        "ariaLabel": undefined,
        "tabIndex": -1,
        "tagName": "DIV",
      }
    `);
  });

  it('renders fallback message when API is unavailable', async () => {
    delete (window as { ymaps3?: unknown }).ymaps3;
    const loadedScript = document.createElement('script');
    loadedScript.dataset.yandexMapsApi = 'true';
    loadedScript.dataset.loaded = 'true';
    document.head.appendChild(loadedScript);

    const { container } = render(SettlementMap, {
      props: { settlements: mockSettlements },
    });

    await waitFor(
      () => {
        expect(container.textContent).toMatch(
          /API ключ не настроен|Не удалось загрузить карту|Yandex Maps API не доступен/,
        );
      },
      { timeout: 2000 },
    );
  });
});
