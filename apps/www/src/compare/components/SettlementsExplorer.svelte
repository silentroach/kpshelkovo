<script lang="ts">
  import { compareRuText, formatTariff } from '@shelkovo/format';
  import { calculateDistance } from '@shelkovo/geo';
  import Link from '@shelkovo/ui/Link.svelte';
  import { onMount } from 'svelte';
  import type { ExplorerPayload, ExplorerSettlement } from '../lib/explorer';
  import { getRing } from '../lib/rating';
  import {
    buildExplorerUrl,
    DEFAULT_EXPLORER_QUERY,
    readExplorerQuery,
    withBase,
  } from '../lib/url';
  import type { ExplorerPriceFilter, ExplorerSort } from '../lib/url.types';
  import SettlementMap from './SettlementMap.svelte';
  import SettlementCard from './SettlementCard.svelte';

  interface Props {
    readonly settlements: readonly ExplorerSettlement[];
    readonly comparisons: ExplorerPayload['comparisons'];
    readonly stats: ExplorerPayload['stats'];
  }

  let { settlements, comparisons, stats }: Props = $props();

  const uid = $props.id();
  const allid = `${uid}-price-all`;
  const cheapid = `${uid}-price-cheaper`;
  const moreid = `${uid}-price-more`;
  const sortid = `${uid}-sort`;
  const mapid = `${uid}-map`;
  const mapHeight = 375;

  // Находим Шелково как базу для расчета расстояний.
  const shelkovo = $derived(settlements.find((s) => s.isBaseline));

  // Считаем расстояние от Шелково до поселка.
  function getDistanceFromShelkovo(settlement: ExplorerSettlement): number {
    const baseline = shelkovo;
    if (!baseline || settlement.isBaseline) return 0;
    return calculateDistance(
      baseline.location.lat,
      baseline.location.lng,
      settlement.location.lat,
      settlement.location.lng,
    );
  }

  function getDistanceFromMkad(settlement: ExplorerSettlement): number {
    return getRing(settlement.location.lat, settlement.location.lng);
  }

  function tariffText(settlement: ExplorerSettlement): string {
    const text = formatTariff(settlement.tariff.normalizedPerSotkaMonth);
    return settlement.tariff.normalizedIsEstimate ? `~${text}` : text;
  }

  function tariffHint(settlement: ExplorerSettlement): string | undefined {
    if (!settlement.tariff.normalizedIsEstimate) return;
    return 'Тариф приведен к сотке автоматически.';
  }

  function rankExplorer(
    list: readonly ExplorerSettlement[],
  ): Readonly<Record<string, number>> {
    let prev: number | undefined;
    let rank = 0;
    const ranks: Record<string, number> = {};

    [...list]
      .sort((a, b) => {
        const diff =
          a.tariff.normalizedPerSotkaMonth - b.tariff.normalizedPerSotkaMonth;
        if (diff !== 0) return diff;
        return compareRuText(a.shortName, b.shortName);
      })
      .forEach((item) => {
        const tariff = item.tariff.normalizedPerSotkaMonth;
        if (tariff !== prev) {
          prev = tariff;
          rank += 1;
        }
        ranks[item.slug] = rank;
      });

    return ranks;
  }

  // Состояние фильтров и сортировки.
  let sortBy = $state<ExplorerSort>(DEFAULT_EXPLORER_QUERY.sortBy);
  let priceFilter = $state<ExplorerPriceFilter>(
    DEFAULT_EXPLORER_QUERY.priceFilter,
  );
  let showMap = $state(false);
  let mobile = $state(false);
  let controlsReady = $state(false);
  let mapFitRevision = $state(0);

  const syncExplorerUrl = (): void => {
    const nextUrl = buildExplorerUrl(window.location.href, {
      sortBy,
      priceFilter,
    });
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return;

    window.history.replaceState(window.history.state, '', nextUrl);
  };

  const setPriceFilter = (nextFilter: ExplorerPriceFilter): void => {
    if (nextFilter === priceFilter) return;

    priceFilter = nextFilter;
    mapFitRevision += 1;
    syncExplorerUrl();
  };

  // Производный список поселков после фильтрации и сортировки.
  let filteredSettlements = $derived.by(() => {
    let result = [...settlements];

    // Применяем фильтр цены.
    if (priceFilter !== 'all') {
      result = result.filter((s) => {
        const comparison = comparisons[s.slug];
        if (!comparison) return true;
        if (priceFilter === 'cheaper') return comparison.isCheaper;
        if (priceFilter === 'more_expensive')
          return (
            !comparison.isCheaper &&
            comparison.tariffDelta !== 0 &&
            !s.isBaseline
          );
        return true;
      });
    }

    // Сортируем.
    result.sort((a, b) => {
      switch (sortBy) {
        case 'rating_desc': {
          const diff = b.rating - a.rating;
          if (diff !== 0) return diff;
          return compareRuText(a.shortName, b.shortName);
        }
        case 'rating_asc': {
          const diff = a.rating - b.rating;
          if (diff !== 0) return diff;
          return compareRuText(a.shortName, b.shortName);
        }
        case 'tariff_asc':
          return (
            a.tariff.normalizedPerSotkaMonth - b.tariff.normalizedPerSotkaMonth
          );
        case 'tariff_desc':
          return (
            b.tariff.normalizedPerSotkaMonth - a.tariff.normalizedPerSotkaMonth
          );
        case 'mkad':
          return getDistanceFromMkad(a) - getDistanceFromMkad(b);
        case 'distance':
          return getDistanceFromShelkovo(a) - getDistanceFromShelkovo(b);
        case 'name':
          return compareRuText(a.shortName, b.shortName);
        default:
          return 0;
      }
    });

    return result;
  });

  let displayedSettlements = $derived(filteredSettlements);
  let totalCount = $derived(settlements.length);
  let displayedCount = $derived(displayedSettlements.length);
  let compact = $derived(priceFilter !== 'all' || sortBy !== 'rating_desc');
  let help = $derived(sortBy === 'rating_desc' || sortBy === 'rating_asc');
  let mapSettlements = $derived.by(() =>
    displayedSettlements.map((s) => {
      const company = s.managementCompany;

      return {
        slug: s.slug,
        name: s.name,
        shortName: s.shortName,
        lat: s.location.lat,
        lng: s.location.lng,
        normalizedTariff: s.tariff.normalizedPerSotkaMonth,
        isBaseline: s.isBaseline,
        tariffText: tariffText(s),
        tariffHint: tariffHint(s),
        companyText: typeof company === 'string' ? company : company?.title,
      };
    }),
  );
  let ranks = $derived(rankExplorer(settlements));
  let levels = $derived(Math.max(new Set(Object.values(ranks)).size, 1));

  onMount(() => {
    const query = readExplorerQuery(window.location.search);
    sortBy = query.sortBy;
    priceFilter = query.priceFilter;
    mapFitRevision += 1;
    syncExplorerUrl();

    const media = window.matchMedia('(max-width: 767px)');
    mobile = media.matches;
    showMap = !mobile;
    controlsReady = true;

    const onChange = (e: MediaQueryListEvent) => {
      mobile = e.matches;
    };
    media.addEventListener('change', onChange);

    return () => {
      media.removeEventListener('change', onChange);
    };
  });
</script>

<div class="explorer">
  <section class="ui-shell explorer-controls" data-testid="explorer-controls">
    <div class="controls-row">
      <fieldset class="filter-fieldset">
        <legend class="visually-hidden">Фильтр по тарифу</legend>
        <div class="filter-group" data-testid="price-filter-group">
          <span class="filter-caption" aria-hidden="true">Фильтр:</span>
          <span class="filter-option">
            <input
              id={allid}
              type="radio"
              name={`${uid}-price`}
              value="all"
              checked={priceFilter === 'all'}
              onchange={() => setPriceFilter('all')}
              disabled={!controlsReady}
              class="filter-input visually-hidden"
              data-testid="price-all"
            />
            <label
              for={allid}
              class="ui-btn ui-btn-sm filter-label {priceFilter === 'all'
                ? 'ui-btn-primary ui-btn-soft'
                : 'ui-btn-ghost'}"
            >
              Все
            </label>
          </span>
          <span class="filter-option">
            <input
              id={cheapid}
              type="radio"
              name={`${uid}-price`}
              value="cheaper"
              checked={priceFilter === 'cheaper'}
              onchange={() => setPriceFilter('cheaper')}
              disabled={!controlsReady}
              class="filter-input visually-hidden"
              data-testid="price-cheaper"
            />
            <label
              for={cheapid}
              class="ui-btn ui-btn-sm filter-label {priceFilter === 'cheaper'
                ? 'ui-btn-primary ui-btn-soft'
                : 'ui-btn-ghost'}"
            >
              {mobile ? 'Дешевле' : 'Дешевле Шелково'}
              <span
                class="filter-count filter-count--cheaper"
                aria-hidden="true"
                data-testid="price-cheaper-count"
              >
                {stats.cheaperCount}
              </span>
            </label>
          </span>
          <span class="filter-option">
            <input
              id={moreid}
              type="radio"
              name={`${uid}-price`}
              value="more_expensive"
              checked={priceFilter === 'more_expensive'}
              onchange={() => setPriceFilter('more_expensive')}
              disabled={!controlsReady}
              class="filter-input visually-hidden"
              data-testid="price-more"
            />
            <label
              for={moreid}
              class="ui-btn ui-btn-sm filter-label {priceFilter ===
              'more_expensive'
                ? 'ui-btn-primary ui-btn-soft'
                : 'ui-btn-ghost'}"
            >
              {mobile ? 'Дороже' : 'Дороже Шелково'}
              <span
                class="filter-count filter-count--more"
                aria-hidden="true"
                data-testid="price-more-count"
              >
                {stats.moreExpensiveCount}
              </span>
            </label>
          </span>
        </div>
      </fieldset>
      <button
        type="button"
        disabled={!controlsReady}
        class="ui-btn ui-btn-sm map-toggle {showMap
          ? 'ui-btn-outline'
          : 'ui-btn-ghost'}"
        onclick={() => {
          showMap = !showMap;
        }}
        aria-expanded={showMap}
        aria-controls={showMap ? mapid : undefined}
        data-testid="map-toggle"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          class="map-toggle-icon"
          aria-hidden="true"
        >
          <path
            d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm5.8 7h-2.3A12 12 0 0 0 12.6 4a6.5 6.5 0 0 1 3.2 5Zm-5.8 7.4A10.5 10.5 0 0 1 8.6 11h2.8A10.5 10.5 0 0 1 10 16.4Zm-1.7 0A8.9 8.9 0 0 1 7 11h2.1a8.9 8.9 0 0 0 1.2 5.4 6.2 6.2 0 0 1-2 0Zm-3-7.4A6.5 6.5 0 0 1 8.5 4 12 12 0 0 0 7.6 9H5.3Zm0 2h2.3a12 12 0 0 0 .9 5 6.5 6.5 0 0 1-3.2-5Zm4.7-2A10.5 10.5 0 0 1 10 3.6 10.5 10.5 0 0 1 11.4 9H8.6Zm2.9 2H15a6.5 6.5 0 0 1-3.2 5 12 12 0 0 0 .9-5Z"
          />
        </svg>
        <span>{showMap ? 'Скрыть карту' : 'Показать карту'}</span>
      </button>
    </div>
  </section>

  {#if showMap}
    <section id={mapid} data-testid="filtered-map">
      <SettlementMap
        settlements={mapSettlements}
        height={mapHeight}
        startFromMoscow
        fitRevision={mapFitRevision}
      />
    </section>
  {:else if !controlsReady}
    <div
      class="map-placeholder"
      style={`height: ${mapHeight}px; min-height: ${mapHeight}px;`}
      aria-hidden="true"
    ></div>
  {/if}

  <div class="summary-row" data-testid="explorer-summary-row">
    <p class="summary" data-testid="displayed-count">
      Показано <span class="summary-count">{displayedCount}</span>
      из
      <span class="summary-count">{totalCount}</span>
      {#if compact}
        <span class="active-filters">активные фильтры</span>
      {/if}
    </p>
    <div class="sort-controls">
      <label for={sortid} class="sort-label"> Сортировка: </label>
      <div class="sort-field">
        <select
          id={sortid}
          value={sortBy}
          disabled={!controlsReady}
          aria-label="Сортировка поселков"
          onchange={(e) => {
            sortBy = (e.currentTarget as HTMLSelectElement)
              .value as typeof sortBy;
            syncExplorerUrl();
          }}
          class="sort-select"
          data-testid="sort-select"
        >
          <option value="rating_desc">Условный уровень (↓)</option>
          <option value="rating_asc">Условный уровень (↑)</option>
          <option value="tariff_asc">По тарифу (↑)</option>
          <option value="tariff_desc">По тарифу (↓)</option>
          <option value="mkad">По расстоянию до МКАД</option>
          <option value="distance">По расстоянию до Шелково</option>
          <option value="name">По названию</option>
        </select>

        <span class="rating-help-slot">
          {#if help}
            <Link
              href={withBase('/rating/')}
              class="rating-help"
              aria-label="Как считается условный уровень"
              title="Как считается условный уровень"
              data-testid="rating-help-link"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                class="rating-help-icon"
                stroke="currentColor"
                stroke-width="1.6"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="7.25"></circle>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8.7 7.6A1.8 1.8 0 0 1 10.2 7c1 0 1.8.7 1.8 1.7 0 .8-.4 1.2-1.1 1.7-.7.4-1 .8-1 1.6"
                ></path>
                <circle
                  cx="10"
                  cy="13.9"
                  r="0.7"
                  fill="currentColor"
                  stroke="none"
                ></circle>
              </svg>
            </Link>
          {/if}
        </span>
      </div>
    </div>
  </div>

  <div class="settlement-grid">
    {#each displayedSettlements as settlement (settlement.slug)}
      <SettlementCard
        {settlement}
        comparison={comparisons[settlement.slug]}
        rank={ranks[settlement.slug] ?? levels}
        total={levels}
        isBaseline={settlement.isBaseline}
      />
    {/each}
  </div>

  {#if displayedCount === 0}
    <div class="ui-shell empty-state">
      <p class="empty-title">Ничего не найдено</p>
      <p class="empty-hint">Попробуйте изменить фильтры</p>
    </div>
  {/if}
</div>

<style>
  .explorer > :not(:first-child) {
    margin-block-start: 1.5rem;
  }

  .explorer-controls {
    padding: 1.25rem 0 0;
  }

  .controls-row,
  .filter-group,
  .sort-controls,
  .sort-field {
    display: flex;
    align-items: center;
  }

  .controls-row {
    align-items: flex-start;
    gap: 0.5rem;
  }

  .filter-fieldset {
    min-width: 0;
    flex: 1 1 0%;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .filter-group {
    min-width: 0;
    flex-wrap: nowrap;
    gap: 0.375rem;
    overflow-x: auto;
    padding-right: 0.25rem;
  }

  .filter-caption {
    margin-right: 0.25rem;
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .filter-option {
    display: inline-flex;
  }

  .filter-label,
  .map-toggle {
    min-height: 2.25rem;
  }

  .filter-label {
    white-space: nowrap;
  }

  .filter-input:disabled + .filter-label {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .filter-input:focus-visible + .filter-label {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .filter-count {
    display: inline-flex;
    min-width: 1.25rem;
    align-items: center;
    justify-content: center;
    margin-left: 0.25rem;
    border: 1px solid;
    border-radius: var(--radius-full);
    padding: 0.125rem 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
  }

  .filter-count--cheaper {
    border-color: var(--color-success-border);
    background: var(--color-success-soft);
    color: var(--color-success-text);
  }

  .filter-count--more {
    border-color: var(--color-danger-border);
    background: var(--color-danger-soft);
    color: var(--color-danger-text);
  }

  .map-toggle {
    flex-shrink: 0;
  }

  .map-toggle-icon,
  .rating-help-icon {
    width: 1rem;
    height: 1rem;
  }

  .map-placeholder {
    display: none;
    border: 1px solid var(--color-border);
    background: var(--color-bg-soft);
  }

  .summary-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
  }

  .summary {
    min-width: 0;
    color: var(--color-text-muted);
    font-size: 1rem;
    line-height: 1.5rem;
  }

  .summary-count {
    color: var(--color-text);
    font-weight: 600;
  }

  .active-filters {
    display: inline-flex;
    align-items: center;
    margin-left: 0.5rem;
    border-left: 1px solid var(--color-border);
    padding-left: 0.5rem;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .sort-controls {
    min-width: 0;
    flex-shrink: 0;
    gap: 0.75rem;
  }

  .sort-label {
    display: none;
    color: var(--color-text);
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.25rem;
    white-space: nowrap;
  }

  .sort-field {
    min-width: 0;
    flex: 1 1 0%;
    gap: 0.5rem;
  }

  .sort-select {
    display: block;
    min-width: 0;
    flex: 1 1 0%;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.75rem;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 1rem;
    line-height: 1.5rem;
  }

  .sort-select:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .sort-select:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-focus);
  }

  .rating-help-slot,
  .rating-help-slot :global(.rating-help) {
    display: inline-flex;
    width: 1.25rem;
    height: 1.25rem;
    align-items: center;
    justify-content: center;
  }

  .rating-help-slot :global(.rating-help) {
    color: var(--color-text-muted);
    transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .rating-help-slot :global(.rating-help:hover) {
    color: var(--color-primary);
  }

  .settlement-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    border-bottom: 1px solid var(--color-border);
  }

  .empty-state {
    padding: 2.5rem;
    text-align: center;
  }

  .empty-title {
    color: var(--color-text);
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.75rem;
  }

  .empty-hint {
    margin-top: 0.5rem;
    color: var(--color-text-muted);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  @media (min-width: 40rem) {
    .summary-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .summary {
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    .sort-controls {
      min-width: fit-content;
    }

    .sort-label {
      display: inline;
    }

    .sort-field {
      flex: none;
    }

    .sort-select {
      width: auto;
      flex: none;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }
  }

  @media (min-width: 48rem) {
    .controls-row {
      align-items: center;
      justify-content: space-between;
    }

    .filter-group {
      gap: 0.5rem;
    }

    .filter-caption {
      font-size: 0.75rem;
      line-height: 1rem;
    }

    .filter-label,
    .map-toggle {
      min-height: 2rem;
    }

    .map-placeholder {
      display: block;
    }

    .settlement-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      border-bottom: 0;
    }
  }

  @media (min-width: 64rem) {
    .settlement-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
