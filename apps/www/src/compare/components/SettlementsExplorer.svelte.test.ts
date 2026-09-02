import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/svelte';
import SettlementsExplorer from './SettlementsExplorer.svelte';
import type { ExplorerSettlement } from '../lib/explorer';
import type { ComparisonResult, Stats } from '../lib/settlement/types';

type Row = ExplorerSettlement;

const mockMap = {
  addChild: vi.fn(),
  removeChild: vi.fn(),
  update: vi.fn(),
  destroy: vi.fn(),
};

const mockYandexMaps = {
  ready: Promise.resolve(),
  YMap: vi.fn(function YMap() {
    return mockMap;
  }),
  YMapDefaultSchemeLayer: vi.fn(function YMapDefaultSchemeLayer() {
    return {};
  }),
  YMapDefaultFeaturesLayer: vi.fn(function YMapDefaultFeaturesLayer() {
    return {};
  }),
  YMapMarker: vi.fn(function YMapMarker() {
    return { update: vi.fn() };
  }),
};

const stats: Stats = {
  shelkovoTariff: 120,
  medianTariff: 100,
  peerMedianTariff: 95,
  meanTariff: 110,
  minTariff: 80,
  maxTariff: 160,
  shelkovoRank: 2,
  totalSettlements: 2,
  cheaperCount: 1,
  moreExpensiveCount: 0,
  shelkovoVsMedianPercent: 20,
  shelkovoVsPeerMedianPercent: 26,
  shelkovoVsMeanPercent: 10,
};

const settlements: Row[] = [
  {
    name: 'КП Шелково',
    shortName: 'Шелково',
    slug: 'shelkovo',
    rating: 71.2,
    managementCompany: 'УК Шелково',
    isBaseline: true,
    location: {
      lat: 55.82,
      lng: 37.14,
      district: 'Истринский район',
    },
    tariff: {
      normalizedPerSotkaMonth: 120,
      normalizedIsEstimate: false,
    },
  },
  {
    name: 'КП Лесное',
    shortName: 'Лесное',
    slug: 'lesnoe',
    rating: 58.4,
    managementCompany: 'УК Лесное',
    isBaseline: false,
    location: {
      lat: 55.85,
      lng: 37.2,
      district: 'Истринский район',
    },
    tariff: {
      normalizedPerSotkaMonth: 90,
      normalizedIsEstimate: false,
    },
  },
  {
    name: 'КП Усадьбы',
    shortName: 'Усадьбы',
    slug: 'usadby',
    rating: 84.7,
    managementCompany: 'УК Усадьбы',
    isBaseline: false,
    location: {
      lat: 55.83,
      lng: 37.16,
      district: 'Истринский район',
    },
    tariff: {
      normalizedPerSotkaMonth: 150,
      normalizedIsEstimate: false,
    },
  },
];

const comparisons: Record<string, ComparisonResult> = {
  shelkovo: {
    tariffDelta: 0,
    tariffDeltaPercent: 0,
    isCheaper: false,
  },
  lesnoe: {
    tariffDelta: -30,
    tariffDeltaPercent: -25,
    isCheaper: true,
  },
  usadby: {
    tariffDelta: 30,
    tariffDeltaPercent: 25,
    isCheaper: false,
  },
};

function cardNames(container: HTMLElement): string[] {
  return [
    ...container.querySelectorAll('[data-testid="settlement-card"] h3'),
  ].map((el) => el.textContent?.trim() ?? '');
}

const currentPath = (): string =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;

function setScreen(mobile: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mobile && query.includes('max-width: 767px'),
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('SettlementsExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/815/compare/');
    Object.defineProperty(window, 'ymaps3', {
      value: mockYandexMaps,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as { ymaps3?: unknown }).ymaps3;
  });

  it('hides map by default on mobile', async () => {
    setScreen(true);

    const { container } = render(SettlementsExplorer, {
      props: { settlements, comparisons, stats },
    });

    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="filtered-map"]'),
      ).toBeNull();
    });
  });

  it('toggles map visibility by button', async () => {
    setScreen(true);

    const { getByTestId, container } = render(SettlementsExplorer, {
      props: { settlements, comparisons, stats },
    });

    await waitFor(() => {
      expect(getByTestId('map-toggle')).toBeTruthy();
    });
    const btn = getByTestId('map-toggle');
    await fireEvent.click(btn);

    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="filtered-map"]'),
      ).toBeTruthy();
    });
  });

  it('updates map markers after filter change', async () => {
    setScreen(false);

    const { getByLabelText } = render(SettlementsExplorer, {
      props: { settlements, comparisons, stats },
    });

    await waitFor(() => {
      expect(mockYandexMaps.YMapMarker).toHaveBeenCalledTimes(3);
    });

    await fireEvent.click(getByLabelText(/Дешевле Шелково/));

    await waitFor(() => {
      expect(mockYandexMaps.YMapMarker).toHaveBeenCalledTimes(3);
      expect(mockMap.removeChild).toHaveBeenCalledTimes(2);
    });
  });

  it('uses rating order by default', async () => {
    setScreen(false);

    const { container } = render(SettlementsExplorer, {
      props: { settlements, comparisons, stats },
    });

    await waitFor(() => {
      expect(cardNames(container)).toEqual(['Усадьбы', 'Шелково', 'Лесное']);
    });
  });

  it('restores sorting and filtering from a shared URL', async () => {
    setScreen(false);
    window.history.replaceState(
      {},
      '',
      '/815/compare/?sort=tariff_asc&price=more_expensive',
    );

    const { container, getByTestId } = render(SettlementsExplorer, {
      props: { settlements, comparisons, stats },
    });

    await waitFor(() => expect(mockMap.update).toHaveBeenCalledOnce());
    expect({
      cards: cardNames(container),
      mapUpdate: mockMap.update.mock.calls[0]?.[0],
      price: (getByTestId('price-more') as HTMLInputElement).checked,
      sort: (getByTestId('sort-select') as HTMLSelectElement).value,
    }).toMatchInlineSnapshot(`
      {
        "cards": [
          "Усадьбы",
        ],
        "mapUpdate": {
          "location": {
            "center": [
              37.16,
              55.83,
            ],
            "duration": 250,
            "zoom": 12,
          },
          "margin": [
            0,
            0,
            0,
            0,
          ],
        },
        "price": true,
        "sort": "tariff_asc",
      }
    `);
  });

  it('replaces the current URL when controls change', async () => {
    setScreen(false);
    window.history.replaceState(
      { astro: 'preserved' },
      '',
      '/815/compare/?from=chat#results',
    );
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const pushState = vi.spyOn(window.history, 'pushState');

    const { getByTestId } = render(SettlementsExplorer, {
      props: { settlements, comparisons, stats },
    });

    await fireEvent.change(getByTestId('sort-select'), {
      target: { value: 'tariff_asc' },
    });
    await fireEvent.click(getByTestId('price-cheaper'));

    await waitFor(() => {
      expect(currentPath()).toBe(
        '/815/compare/?from=chat&sort=tariff_asc&price=cheaper#results',
      );
    });
    expect(replaceState).toHaveBeenLastCalledWith(
      { astro: 'preserved' },
      '',
      '/815/compare/?from=chat&sort=tariff_asc&price=cheaper#results',
    );
    expect(pushState).not.toHaveBeenCalled();
  });

  it('cleans unknown query values while keeping unrelated state', async () => {
    setScreen(false);
    window.history.replaceState(
      {},
      '',
      '/815/compare/?sort=unknown&price=unknown&from=chat#results',
    );

    const { container, getByTestId } = render(SettlementsExplorer, {
      props: { settlements, comparisons, stats },
    });

    await waitFor(() => {
      expect(currentPath()).toBe('/815/compare/?from=chat#results');
      expect(cardNames(container)).toEqual(['Усадьбы', 'Шелково', 'Лесное']);
      expect((getByTestId('price-all') as HTMLInputElement).checked).toBe(true);
    });
  });

  it('sorts by conditional level in both directions', async () => {
    setScreen(false);

    const { container, getByLabelText } = render(SettlementsExplorer, {
      props: { settlements, comparisons, stats },
    });

    await waitFor(() => {
      expect(getByLabelText('Сортировка:')).toBeTruthy();
    });

    await fireEvent.change(getByLabelText('Сортировка:'), {
      target: { value: 'rating_desc' },
    });

    await waitFor(() => {
      expect(cardNames(container)).toEqual(['Усадьбы', 'Шелково', 'Лесное']);
    });

    await fireEvent.change(getByLabelText('Сортировка:'), {
      target: { value: 'rating_asc' },
    });

    await waitFor(() => {
      expect(cardNames(container)).toEqual(['Лесное', 'Шелково', 'Усадьбы']);
    });
  });

  it('shows help link for conditional level sorting', async () => {
    setScreen(false);

    const { container, getByLabelText, queryByTestId } = render(
      SettlementsExplorer,
      {
        props: { settlements, comparisons, stats },
      },
    );

    await waitFor(() => {
      expect(getByLabelText('Сортировка:')).toBeTruthy();
    });

    await waitFor(() => {
      const link = container.querySelector(
        '[data-testid="rating-help-link"]',
      ) as HTMLAnchorElement | null;
      expect(link?.getAttribute('href')).toBe('/815/compare/rating/');
    });

    await fireEvent.change(getByLabelText('Сортировка:'), {
      target: { value: 'tariff_asc' },
    });

    await waitFor(() => {
      expect(queryByTestId('rating-help-link')).toBeNull();
    });
  });

  it('sorts by distance to MKAD', async () => {
    setScreen(false);

    const { container, getByLabelText } = render(SettlementsExplorer, {
      props: { settlements, comparisons, stats },
    });

    await waitFor(() => {
      expect(getByLabelText('Сортировка:')).toBeTruthy();
    });

    await fireEvent.change(getByLabelText('Сортировка:'), {
      target: { value: 'mkad' },
    });

    await waitFor(() => {
      expect(cardNames(container)).toEqual(['Лесное', 'Усадьбы', 'Шелково']);
    });
  });

  it('sorts by distance from Shelkovo', async () => {
    setScreen(false);

    const { container, getByLabelText } = render(SettlementsExplorer, {
      props: { settlements, comparisons, stats },
    });

    await waitFor(() => {
      expect(getByLabelText('Сортировка:')).toBeTruthy();
    });
    const sort = getByLabelText('Сортировка:') as HTMLSelectElement;
    sort.value = 'distance';
    await fireEvent.change(sort);

    expect(sort.value).toBe('distance');

    await waitFor(() => {
      expect(cardNames(container)).toEqual(['Шелково', 'Усадьбы', 'Лесное']);
    });
  });

  it('sorts alphabetically by name', async () => {
    setScreen(false);

    const { container, getByLabelText } = render(SettlementsExplorer, {
      props: { settlements, comparisons, stats },
    });

    await waitFor(() => {
      expect(getByLabelText('Сортировка:')).toBeTruthy();
    });
    await fireEvent.change(getByLabelText('Сортировка:'), {
      target: { value: 'name' },
    });

    await waitFor(() => {
      expect(cardNames(container)).toEqual(['Лесное', 'Усадьбы', 'Шелково']);
    });
  });

  it('keeps explicit control links for accessibility', async () => {
    setScreen(false);

    const { getByTestId, getByLabelText, container } = render(
      SettlementsExplorer,
      {
        props: { settlements, comparisons, stats },
      },
    );

    await waitFor(() => {
      expect(getByTestId('sort-select')).toBeTruthy();
    });
    const sort = getByTestId('sort-select') as HTMLSelectElement;
    const sortLabel = getByLabelText('Сортировка:') as HTMLSelectElement;
    expect(sortLabel.id).toBe(sort.id);

    const filter = getByTestId('price-cheaper') as HTMLInputElement;
    const filterLabel = container.querySelector(`label[for="${filter.id}"]`);
    expect(filterLabel?.textContent).toContain('Дешевле');
    expect(getByTestId('price-cheaper-count').textContent).toBe('1');
    expect(getByTestId('price-more-count').textContent).toBe('0');

    const btn = getByTestId('map-toggle');
    const mapid = btn.getAttribute('aria-controls');
    expect(mapid).toBeTruthy();
    expect(container.querySelector(`#${mapid}`)).toBeTruthy();
  });

  it('uses shared button primitives for filter and map controls', async () => {
    setScreen(false);

    const { container, getByTestId } = render(SettlementsExplorer, {
      props: { settlements, comparisons, stats },
    });

    await waitFor(() => {
      expect(getByTestId('map-toggle')).toBeTruthy();
    });

    const filter = getByTestId('price-cheaper') as HTMLInputElement;
    const filterLabel = container.querySelector(`label[for="${filter.id}"]`);
    expect(filterLabel?.className).toContain('ui-btn');
    expect(getByTestId('map-toggle').className).toContain('ui-btn');
  });

  it('uses one rank for duplicate tariffs', async () => {
    setScreen(false);

    const tied = [
      ...settlements,
      {
        ...settlements[2],
        name: 'КП Усадьбы 2',
        shortName: 'Усадьбы 2',
        slug: 'usadby-2',
      },
    ];

    const { container } = render(SettlementsExplorer, {
      props: { settlements: tied, comparisons, stats },
    });

    await waitFor(() => {
      expect(
        container.querySelectorAll('[data-testid="settlement-card"]'),
      ).toHaveLength(4);
    });

    const labels = [
      ...container.querySelectorAll('[data-testid="tariff-rank-label"]'),
    ].map((item) => item.textContent?.trim() ?? '');

    expect(labels).toContain('3 / 3');
    expect(labels.filter((item) => item === '3 / 3')).toHaveLength(2);
  });
});
