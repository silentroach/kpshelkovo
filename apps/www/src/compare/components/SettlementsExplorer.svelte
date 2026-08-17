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
    settlements?: ExplorerSettlement[];
    comparisons?: ExplorerPayload['comparisons'];
    stats?: ExplorerPayload['stats'];
    dataUrl?: string;
  }

  let {
    settlements = [] as ExplorerSettlement[],
    comparisons = {} as ExplorerPayload['comparisons'],
    stats,
    dataUrl = '',
  }: Props = $props();

  const uid = $props.id();
  const allid = `${uid}-price-all`;
  const cheapid = `${uid}-price-cheaper`;
  const moreid = `${uid}-price-more`;
  const sortid = `${uid}-sort`;
  const mapid = `${uid}-map`;

  let ready = $derived(settlements.length > 0 || dataUrl.length === 0);
  let tryid = $state(0);

  function msg(err: unknown): string {
    if (err instanceof Error) return err.message;
    return 'Не удалось загрузить данные';
  }

  async function pull(url: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Не удалось загрузить данные');

    const data = (await res.json()) as ExplorerPayload;
    settlements = data.settlements;
    comparisons = data.comparisons;
    stats = data.stats;

    window.dispatchEvent(new CustomEvent('explorer:ready'));
  }

  let fetchErr = $state<Error | undefined>(undefined);

  $effect(() => {
    if (ready) return;
    if (!dataUrl) {
      fetchErr = new Error('Не указан источник данных');
      return;
    }
    tryid;
    let cancelled = false;
    fetchErr = undefined;
    pull(dataUrl).catch((err) => {
      if (!cancelled)
        fetchErr = err instanceof Error ? err : new Error(String(err));
    });
    return () => {
      cancelled = true;
    };
  });

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

  function rankExplorer(list: ExplorerSettlement[]): Map<string, number> {
    let prev: number | undefined;
    let rank = 0;
    const ranks = new Map<string, number>();

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
        ranks.set(item.slug, rank);
      });

    return ranks;
  }

  // Состояние фильтров и сортировки.
  let sortBy = $state<ExplorerSort>(DEFAULT_EXPLORER_QUERY.sortBy);
  let priceFilter = $state<ExplorerPriceFilter>(
    DEFAULT_EXPLORER_QUERY.priceFilter,
  );
  let queryReady = $state(false);
  let showMap = $state(false);
  let mobile = $state(false);

  $effect(() => {
    if (!queryReady) return;

    const nextUrl = buildExplorerUrl(window.location.href, {
      sortBy,
      priceFilter,
    });
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return;

    window.history.replaceState(window.history.state, '', nextUrl);
  });

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
  let levels = $derived(Math.max(new Set(ranks.values()).size, 1));

  onMount(() => {
    const query = readExplorerQuery(window.location.search);
    sortBy = query.sortBy;
    priceFilter = query.priceFilter;
    queryReady = true;

    const media = window.matchMedia('(max-width: 767px)');
    mobile = media.matches;
    showMap = !mobile;

    const onChange = (e: MediaQueryListEvent) => {
      mobile = e.matches;
    };
    media.addEventListener('change', onChange);

    if (ready) {
      window.dispatchEvent(new CustomEvent('explorer:ready'));
    }

    return () => {
      media.removeEventListener('change', onChange);
    };
  });
</script>

<svelte:boundary>
  <span class="sr-only" aria-hidden="true">
    {#if fetchErr}
      {(() => {
        throw fetchErr;
      })()}
    {/if}
  </span>

  <div class="space-y-6">
    <section class="ui-shell px-0 pb-0 pt-5" data-testid="explorer-controls">
      <div class="flex items-start gap-2 md:items-center md:justify-between">
        <fieldset class="min-w-0 flex-1">
          <legend class="sr-only">Фильтр по тарифу</legend>
          <div
            class="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto pr-1 md:gap-2"
          >
            <span
              class="mr-1 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground md:text-xs"
              aria-hidden="true">Фильтр:</span
            >
            <span class="inline-flex">
              <input
                id={allid}
                type="radio"
                name={`${uid}-price`}
                value="all"
                bind:group={priceFilter}
                class="peer sr-only"
                data-testid="price-all"
              />
              <label
                for={allid}
                class="ui-btn ui-btn-sm min-h-9 whitespace-nowrap peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--color-accent)] md:min-h-8 {priceFilter ===
                'all'
                  ? 'ui-btn-primary ui-btn-soft'
                  : 'ui-btn-ghost'}"
              >
                Все
              </label>
            </span>
            <span class="inline-flex">
              <input
                id={cheapid}
                type="radio"
                name={`${uid}-price`}
                value="cheaper"
                bind:group={priceFilter}
                class="peer sr-only"
                data-testid="price-cheaper"
              />
              <label
                for={cheapid}
                class="ui-btn ui-btn-sm min-h-9 whitespace-nowrap peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--color-accent)] md:min-h-8 {priceFilter ===
                'cheaper'
                  ? 'ui-btn-primary ui-btn-soft'
                  : 'ui-btn-ghost'}"
              >
                {mobile ? 'Дешевле' : 'Дешевле Шелково'}
                {#if stats}
                  <span
                    class="ml-1 inline-flex min-w-5 items-center justify-center rounded-full border border-success-border bg-success-soft px-1.5 py-0.5 text-[11px] font-semibold text-success-text"
                    aria-hidden="true"
                    data-testid="price-cheaper-count"
                  >
                    {stats.cheaperCount}
                  </span>
                {/if}
              </label>
            </span>
            <span class="inline-flex">
              <input
                id={moreid}
                type="radio"
                name={`${uid}-price`}
                value="more_expensive"
                bind:group={priceFilter}
                class="peer sr-only"
                data-testid="price-more"
              />
              <label
                for={moreid}
                class="ui-btn ui-btn-sm min-h-9 whitespace-nowrap peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--color-accent)] md:min-h-8 {priceFilter ===
                'more_expensive'
                  ? 'ui-btn-primary ui-btn-soft'
                  : 'ui-btn-ghost'}"
              >
                {mobile ? 'Дороже' : 'Дороже Шелково'}
                {#if stats}
                  <span
                    class="ml-1 inline-flex min-w-5 items-center justify-center rounded-full border border-danger-border bg-danger-soft px-1.5 py-0.5 text-[11px] font-semibold text-danger-text"
                    aria-hidden="true"
                    data-testid="price-more-count"
                  >
                    {stats.moreExpensiveCount}
                  </span>
                {/if}
              </label>
            </span>
          </div>
        </fieldset>
        <button
          type="button"
          class="ui-btn ui-btn-sm min-h-9 shrink-0 md:min-h-8 {showMap
            ? 'ui-btn-outline'
            : 'ui-btn-ghost'}"
          onclick={() => {
            showMap = !showMap;
          }}
          aria-label={showMap ? 'Скрыть карту' : 'Показать карту'}
          aria-expanded={showMap}
          aria-controls={showMap ? mapid : undefined}
          data-testid="map-toggle"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            class="h-4 w-4"
            aria-hidden="true"
          >
            <path
              d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm5.8 7h-2.3A12 12 0 0 0 12.6 4a6.5 6.5 0 0 1 3.2 5Zm-5.8 7.4A10.5 10.5 0 0 1 8.6 11h2.8A10.5 10.5 0 0 1 10 16.4Zm-1.7 0A8.9 8.9 0 0 1 7 11h2.1a8.9 8.9 0 0 0 1.2 5.4 6.2 6.2 0 0 1-2 0Zm-3-7.4A6.5 6.5 0 0 1 8.5 4 12 12 0 0 0 7.6 9H5.3Zm0 2h2.3a12 12 0 0 0 .9 5 6.5 6.5 0 0 1-3.2-5Zm4.7-2A10.5 10.5 0 0 1 10 3.6 10.5 10.5 0 0 1 11.4 9H8.6Zm2.9 2H15a6.5 6.5 0 0 1-3.2 5 12 12 0 0 0 .9-5Z"
            />
          </svg>
          <span>{showMap ? 'Скрыть карту' : 'Карта'}</span>
        </button>
      </div>
    </section>

    {#if showMap}
      <section id={mapid} class="space-y-4" data-testid="filtered-map">
        <SettlementMap settlements={mapSettlements} />
      </section>
    {/if}

    <div
      class="flex flex-col gap-2 pb-1 sm:flex-row sm:items-center sm:justify-between"
      data-testid="explorer-summary-row"
    >
      <p
        class="min-w-0 text-base text-muted-foreground sm:text-sm"
        data-testid="displayed-count"
      >
        Показано <span class="font-semibold text-foreground"
          >{displayedCount}</span
        >
        из
        <span class="font-semibold text-foreground">{totalCount}</span>
        {#if compact}
          <span
            class="ml-2 inline-flex items-center border-l border-border pl-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground"
            >активные фильтры</span
          >
        {/if}
      </p>
      <div class="flex min-w-0 shrink-0 items-center gap-3 sm:min-w-fit">
        <label
          for={sortid}
          class="hidden whitespace-nowrap text-sm font-semibold text-foreground sm:inline"
        >
          Сортировка:
        </label>
        <div class="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
          <select
            id={sortid}
            value={sortBy}
            aria-label="Сортировка поселков"
            onchange={(e) => {
              sortBy = (e.currentTarget as HTMLSelectElement)
                .value as typeof sortBy;
            }}
            class="block min-w-0 flex-1 rounded-sm border border-border bg-[color:var(--color-surface)] px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:flex-none sm:text-sm"
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

          <span class="inline-flex h-5 w-5 items-center justify-center">
            {#if help}
              <Link
                href={withBase('/rating/')}
                class="inline-flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
                aria-label="Как считается условный уровень"
                title="Как считается условный уровень"
                data-testid="rating-help-link"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  class="h-4 w-4"
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

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
      {#each displayedSettlements as settlement (settlement.slug)}
        <SettlementCard
          {settlement}
          comparison={comparisons[settlement.slug]}
          rank={ranks.get(settlement.slug) ?? levels}
          total={levels}
          isBaseline={settlement.isBaseline}
        />
      {/each}
    </div>

    {#if ready && displayedCount === 0}
      <div class="ui-shell p-10 text-center">
        <p class="text-lg font-semibold text-foreground">Ничего не найдено</p>
        <p class="mt-2 text-sm text-muted-foreground">
          Попробуйте изменить фильтры
        </p>
      </div>
    {/if}
  </div>

  {#snippet failed(err, reset)}
    <div
      class="ui-shell space-y-3 p-6 text-center"
      data-testid="explorer-error"
    >
      <p class="text-base font-semibold text-foreground">{msg(err)}</p>
      <p class="text-sm text-muted-foreground">
        Показана статическая версия списка ниже.
      </p>
      <div>
        <button
          type="button"
          class="ui-btn ui-btn-sm ui-btn-outline"
          onclick={() => {
            fetchErr = undefined;
            tryid += 1;
            reset();
          }}
        >
          Повторить
        </button>
      </div>
    </div>
  {/snippet}
</svelte:boundary>
