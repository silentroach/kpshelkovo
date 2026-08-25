<script lang="ts">
  import { count, formatDate, pluralize } from '@shelkovo/format';
  import SearchIcon from '@shelkovo/ui/icons/system/Search.svelte';
  import { onMount, tick } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { on } from 'svelte/events';

  import { pagefindSearchClient } from '@/lib/search/client';
  import type { SearchResult } from '@/lib/search/client.types';
  import {
    SEARCH_QUERY_MAX_LENGTH,
    SEARCH_RESULT_DEFAULT_LIMIT,
  } from '@/lib/search/client.types';
  import { SEARCH_DIALOG_OPEN_EVENT } from './search-dialog.events';
  import type {
    SearchDialogProps,
    SearchDialogRequestMode,
    SearchDialogResultRow,
    SearchDialogState,
    SearchExcerptSegment,
  } from './search-dialog.types';

  const SEARCH_DEBOUNCE_MS = 150;
  const SEARCH_OPEN_GOAL = 'search_open';
  const SEARCH_GOAL = 'search';
  const RESULT_FORMS = ['результат', 'результата', 'результатов'] as const;
  const FOUND_FORMS = ['Найден', 'Найдено', 'Найдено'] as const;

  let { client = pagefindSearchClient }: SearchDialogProps = $props();

  const id = $props.id();
  const dialogId = `${id}-dialog`;
  const headingId = `${id}-heading`;
  const inputId = `${id}-input`;
  const resultsId = `${id}-results`;

  let dialogElement: HTMLDialogElement | undefined;
  let inputElement: HTMLInputElement | undefined;
  let resultsElement = $state<HTMLDivElement>();
  let openerElement: HTMLElement | undefined;
  let restoreFocusOnClose = true;
  let pendingSearchTimer: ReturnType<typeof setTimeout> | undefined;

  let query = $state('');
  let viewState = $state<SearchDialogState>('initial');
  let results = $state.raw<readonly SearchResult[]>([]);
  let requestedLimit = $state(SEARCH_RESULT_DEFAULT_LIMIT);
  let total = $state(0);
  let isSearching = $state(false);
  let isLoadingMore = $state(false);
  let loadMoreFailed = $state(false);

  const reachMetrikaGoal = (
    target: string,
    params?: Readonly<Record<string, string | number>>,
  ): void => {
    const id = Number(document.documentElement.dataset.siteMetrikaId);
    if (!Number.isFinite(id)) {
      return;
    }

    if (params) {
      window.ym?.(id, 'reachGoal', target, params);
      return;
    }

    window.ym?.(id, 'reachGoal', target);
  };

  const hasAnchor = (url: string): boolean => {
    const hashIndex = url.indexOf('#');
    return hashIndex > 0 && hashIndex < url.length - 1;
  };

  const resultRow = (result: SearchResult): SearchDialogResultRow => {
    const anchoredResult = result.subResults.find((item) =>
      hasAnchor(item.url),
    );

    return {
      contextTitle: anchoredResult?.title,
      result,
      url: anchoredResult?.url ?? result.url,
      excerptHtml: anchoredResult?.excerptHtml ?? result.excerptHtml,
    };
  };

  let resultRows = $derived(results.map((result) => resultRow(result)));
  let hasMoreResults = $derived(!isSearching && requestedLimit < total);
  let announcement = $derived.by(() => {
    switch (viewState) {
      case 'loading':
        return 'Ищем по сайту';
      case 'results':
        return `${pluralize(total, FOUND_FORMS)} ${count(total, RESULT_FORMS)}`;
      case 'empty':
        return 'По вашему запросу ничего не найдено';
      case 'error':
        return 'Поиск сейчас не работает';
      case 'dev-unavailable':
        return 'Локальный поисковый индекс недоступен';
      case 'initial':
        return '';
    }
  });

  const clearResults = (): void => {
    results = [];
    requestedLimit = SEARCH_RESULT_DEFAULT_LIMIT;
    total = 0;
    isSearching = false;
    isLoadingMore = false;
    loadMoreFailed = false;
  };

  const clearPendingSearch = (): void => {
    if (pendingSearchTimer === undefined) {
      return;
    }

    clearTimeout(pendingSearchTimer);
    pendingSearchTimer = undefined;
  };

  const resetSearch = (): void => {
    clearPendingSearch();
    query = '';
    viewState = 'initial';
    clearResults();
  };

  const finishClose = (): void => {
    const opener = openerElement;
    const shouldRestoreFocus = restoreFocusOnClose;

    openerElement = undefined;
    restoreFocusOnClose = true;
    resetSearch();

    if (shouldRestoreFocus && opener?.isConnected) {
      opener.focus();
    }
  };

  const closeDialog = (shouldRestoreFocus = true): void => {
    restoreFocusOnClose = shouldRestoreFocus;
    clearPendingSearch();
    if (dialogElement?.open) {
      dialogElement.close();
      return;
    }

    finishClose();
  };

  const openDialog = async (opener: HTMLElement): Promise<void> => {
    if (!dialogElement || dialogElement.open) {
      return;
    }

    openerElement = opener;
    restoreFocusOnClose = true;
    resetSearch();
    dialogElement.showModal();
    reachMetrikaGoal(SEARCH_OPEN_GOAL);
    void client.init?.().catch(() => {});
    await tick();
    inputElement?.focus();
  };

  const isCurrentVisibleQuery = (requestedQuery: string): boolean =>
    Boolean(dialogElement?.open && query === requestedQuery);

  const beginSearch = (): void => {
    isSearching = true;
    isLoadingMore = false;
    loadMoreFailed = false;
    if (results.length === 0) {
      viewState = 'loading';
    }
  };

  const isCurrentRequest = (
    requestedQuery: string,
    mode: SearchDialogRequestMode,
  ): boolean =>
    isCurrentVisibleQuery(requestedQuery) &&
    (mode === 'initial' ? isSearching : isLoadingMore);

  const runSearch = async (
    requestedQuery: string,
    limit: number,
    mode: SearchDialogRequestMode,
  ): Promise<void> => {
    if (!dialogElement?.open || !requestedQuery.trim()) {
      return;
    }

    try {
      const response = await client.search(requestedQuery, limit);
      if (!response) {
        if (isCurrentRequest(requestedQuery, mode) && mode === 'more') {
          isLoadingMore = false;
        }
        return;
      }
      if (!isCurrentRequest(requestedQuery, mode)) {
        return;
      }

      if (response.state === 'devUnavailable') {
        if (mode === 'more') {
          isLoadingMore = false;
          return;
        }
        clearResults();
        viewState = 'dev-unavailable';
        return;
      }

      results = response.results;
      total = response.total;
      requestedLimit = limit;
      if (mode === 'initial') {
        const goalParams =
          response.searchQuery === response.query
            ? {
                query: response.query,
                results_count: response.total,
              }
            : {
                query: response.query,
                normalized_query: response.searchQuery,
                results_count: response.total,
              };
        reachMetrikaGoal(SEARCH_GOAL, goalParams);
        isSearching = false;
      } else {
        isLoadingMore = false;
      }
      viewState = total > 0 ? 'results' : 'empty';
    } catch {
      if (!isCurrentRequest(requestedQuery, mode)) {
        return;
      }
      if (mode === 'more') {
        isLoadingMore = false;
        loadMoreFailed = true;
        return;
      }

      clearResults();
      viewState = 'error';
    }
  };

  const scheduleSearch = (requestedQuery: string): void => {
    clearPendingSearch();
    beginSearch();
    const timer = setTimeout(() => {
      if (pendingSearchTimer !== timer) {
        return;
      }

      pendingSearchTimer = undefined;
      void runSearch(requestedQuery, SEARCH_RESULT_DEFAULT_LIMIT, 'initial');
    }, SEARCH_DEBOUNCE_MS);
    pendingSearchTimer = timer;
  };

  const retrySearch = (): void => {
    clearPendingSearch();
    beginSearch();
    void runSearch(query, SEARCH_RESULT_DEFAULT_LIMIT, 'initial');
  };

  const loadMore = (): void => {
    if (isLoadingMore || !hasMoreResults) {
      return;
    }

    isLoadingMore = true;
    loadMoreFailed = false;
    void runSearch(query, requestedLimit + SEARCH_RESULT_DEFAULT_LIMIT, 'more');
  };

  const loadMoreOnIntersect: Attachment<HTMLElement> = (element) => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { root: resultsElement, rootMargin: '0px 0px 25%' },
    );
    observer.observe(element);

    return () => observer.disconnect();
  };

  const handleInput = (event: Event): void => {
    if (
      !dialogElement?.open ||
      !(event.currentTarget instanceof HTMLInputElement)
    ) {
      return;
    }

    query = event.currentTarget.value;
    if (!query.trim()) {
      clearPendingSearch();
      viewState = 'initial';
      clearResults();
      return;
    }

    void client.preload?.(query).catch(() => {});
    scheduleSearch(query);
  };

  const resultLinks = (): readonly HTMLAnchorElement[] =>
    dialogElement
      ? [
          ...dialogElement.querySelectorAll<HTMLAnchorElement>(
            '[data-search-result]',
          ),
        ]
      : [];

  const tabStops = (): readonly HTMLElement[] =>
    dialogElement
      ? [
          ...dialogElement.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled])',
          ),
        ]
      : [];

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
      return;
    }

    if (
      event.key === 'Tab' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      const stops = tabStops();
      if (stops.length === 0) {
        return;
      }

      const focusedIndex = stops.findIndex(
        (element) => element === document.activeElement,
      );
      const movesPastStart = event.shiftKey && focusedIndex <= 0;
      const movesPastEnd = !event.shiftKey && focusedIndex === stops.length - 1;

      if (!movesPastStart && !movesPastEnd) {
        return;
      }

      event.preventDefault();
      stops[event.shiftKey ? stops.length - 1 : 0]?.focus();
      return;
    }

    const links = resultLinks();
    if (links.length === 0 || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const focusedIndex = links.findIndex(
      (link) => link === document.activeElement,
    );

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      links[Math.min(focusedIndex + 1, links.length - 1)]?.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (focusedIndex === 0) {
        inputElement?.focus();
        return;
      }

      links[focusedIndex < 0 ? links.length - 1 : focusedIndex - 1]?.focus();
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    if (event.target === inputElement && !isSearching) {
      event.preventDefault();
      links[0]?.click();
      return;
    }
  };

  const handleOpenRequest = (event: Event): void => {
    if (
      !(event instanceof CustomEvent) ||
      !(event.detail instanceof HTMLElement)
    ) {
      return;
    }

    void openDialog(event.detail);
  };

  const handleDialogClick = (event: MouseEvent): void => {
    if (event.target === dialogElement) {
      closeDialog();
    }
  };

  const handleResultClick = (event: MouseEvent): void => {
    if (
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    closeDialog(false);
  };

  const excerptStartsWithTitle = (
    segments: readonly SearchExcerptSegment[],
    title: string,
  ): boolean => {
    const excerpt = segments
      .map((segment) => segment.text)
      .join('')
      .replace(/\s+/gu, ' ')
      .trim();
    const normalizedTitle = title.replace(/\s+/gu, ' ').trim();

    return (
      excerpt === normalizedTitle ||
      excerpt.startsWith(`${normalizedTitle}.`) ||
      excerpt.startsWith(`${normalizedTitle} `)
    );
  };

  const excerptSegments = (
    excerptHtml: string,
    contextTitle?: string,
    breakBeforeComparison = false,
  ): readonly SearchExcerptSegment[] => {
    const decoder = document.createElement('textarea');
    const segments: SearchExcerptSegment[] = [];
    let highlighted = false;

    for (const part of excerptHtml.split(/(<mark>|<\/mark>)/giu)) {
      const tag = part.toLowerCase();
      if (tag === '<mark>') {
        highlighted = true;
        continue;
      }
      if (tag === '</mark>') {
        highlighted = false;
        continue;
      }

      decoder.innerHTML = part;
      if (decoder.value) {
        segments.push({ highlighted, text: decoder.value });
      }
    }

    if (contextTitle && !excerptStartsWithTitle(segments, contextTitle)) {
      segments.unshift({
        highlighted: false,
        text: `${contextTitle}:\u00a0`,
      });
    }

    if (!breakBeforeComparison) {
      return segments;
    }

    let foundComparison = false;
    return segments.flatMap((segment) => {
      if (foundComparison) {
        return [segment];
      }

      const index = segment.text.search(/(?:Дешевле|Дороже|Тариф|Базовый)/u);
      if (index < 0) {
        return [segment];
      }

      foundComparison = true;
      if (index === 0) {
        return [{ ...segment, breakBefore: true }];
      }

      return [
        { ...segment, text: segment.text.slice(0, index) },
        {
          ...segment,
          breakBefore: true,
          text: segment.text.slice(index),
        },
      ];
    });
  };

  onMount(() => {
    const removeOpenListener = on(
      document,
      SEARCH_DIALOG_OPEN_EVENT,
      handleOpenRequest,
    );

    return () => {
      removeOpenListener();
      clearPendingSearch();
      restoreFocusOnClose = false;
      if (dialogElement?.open) {
        dialogElement.close();
      }
      openerElement = undefined;
    };
  });
</script>

<dialog
  bind:this={dialogElement}
  id={dialogId}
  class="site-search-dialog"
  aria-labelledby={headingId}
  data-pagefind-ignore="all"
  data-search-state={viewState}
  onclose={finishClose}
  onclick={handleDialogClick}
  onkeydown={handleKeydown}
>
  <div class="site-search-dialog__surface">
    <h2 id={headingId} class="sr-only">Поиск по сайту</h2>
    <div class="site-search-dialog__field">
      <SearchIcon class="size-5 shrink-0 text-muted-foreground" />
      <label for={inputId} class="sr-only">Что найти на сайте</label>
      <input
        bind:this={inputElement}
        bind:value={query}
        id={inputId}
        type="search"
        name="site-search"
        class="site-search-dialog__input"
        placeholder="Что найти?"
        autocomplete="off"
        maxlength={SEARCH_QUERY_MAX_LENGTH}
        aria-controls={viewState === 'initial' ? undefined : resultsId}
        oninput={handleInput}
      />
      <button
        type="button"
        class="site-search-dialog__close"
        aria-label="Закрыть"
        onclick={() => closeDialog()}
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="m6.75 6.75 10.5 10.5"></path>
          <path d="m17.25 6.75-10.5 10.5"></path>
        </svg>
      </button>
    </div>

    {#if viewState !== 'initial'}
      <div
        bind:this={resultsElement}
        id={resultsId}
        class="site-search-dialog__results min-h-0 overflow-y-auto"
        role="region"
        aria-label="Результаты поиска"
        aria-busy={isSearching || isLoadingMore}
      >
        {#if viewState === 'loading'}
          <p class="px-4 py-4 text-sm font-medium text-muted-foreground">
            Ищем…
          </p>
        {:else if viewState === 'empty'}
          <p class="px-4 py-4 text-sm font-medium text-muted-foreground">
            Ничего не нашли
          </p>
        {:else if viewState === 'error'}
          <div class="flex items-center justify-between gap-4 px-4 py-3">
            <p class="text-sm font-medium text-muted-foreground">
              Поиск не работает
            </p>
            <button
              type="button"
              class="ui-btn ui-btn-sm ui-btn-ghost shrink-0"
              onclick={retrySearch}
            >
              Повторить
            </button>
          </div>
        {:else if viewState === 'dev-unavailable'}
          <p class="px-4 py-4 text-sm font-medium text-muted-foreground">
            Локальный поиск недоступен
          </p>
        {:else}
          <ul aria-label="Найденные страницы">
            {#each resultRows as row, index (row.result.url)}
              <li class="border-b border-border last:border-b-0">
                <a
                  id={`${resultsId}-${index}`}
                  href={row.url}
                  class="block min-w-0 px-4 py-3 text-foreground hover:bg-primary-soft-2"
                  data-astro-prefetch="false"
                  data-search-result
                  onclick={handleResultClick}
                >
                  <span
                    class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs leading-5 text-muted-foreground"
                  >
                    <span class="font-semibold">{row.result.section.label}</span
                    >
                    {#if row.result.publishedAt}
                      <time datetime={row.result.publishedAt}>
                        {formatDate(row.result.publishedAt)}
                      </time>
                    {/if}
                  </span>
                  <h3
                    class="mt-1 text-base font-semibold leading-6 [overflow-wrap:anywhere]"
                  >
                    {row.result.title}
                  </h3>
                  {#if row.excerptHtml}
                    {@const segments = excerptSegments(
                      row.excerptHtml,
                      row.contextTitle,
                      row.result.section.id === 'compare',
                    )}
                    <p
                      class={[
                        'site-search-result-excerpt mt-1 [overflow-wrap:anywhere] text-sm leading-5 text-muted-foreground',
                        row.result.section.id === 'compare'
                          ? 'line-clamp-3 sm:line-clamp-2'
                          : 'line-clamp-2',
                      ]}
                    >
                      {#each segments as segment, segmentIndex (segmentIndex)}
                        {#if segment.breakBefore}<br
                          />{/if}{#if segment.highlighted}<mark
                            >{segment.text}</mark
                          >{:else}{segment.text}{/if}
                      {/each}
                    </p>
                  {:else if row.result.matchContext}
                    <p
                      class="site-search-result-excerpt mt-1 line-clamp-2 [overflow-wrap:anywhere] text-sm leading-5 text-muted-foreground"
                    >
                      {row.result.matchContext}
                    </p>
                  {:else if row.result.description}
                    <p
                      class="mt-1 line-clamp-2 [overflow-wrap:anywhere] text-sm leading-5 text-muted-foreground"
                    >
                      {row.result.description}
                    </p>
                  {/if}
                </a>
              </li>
            {/each}
          </ul>

          {#if hasMoreResults}
            {#if loadMoreFailed}
              <div
                class="flex items-center justify-between gap-4 px-4 py-3"
                role="status"
              >
                <p class="text-sm font-medium text-muted-foreground">
                  Не удалось загрузить остальные результаты
                </p>
                <button
                  type="button"
                  class="ui-btn ui-btn-sm ui-btn-ghost shrink-0"
                  onclick={loadMore}
                >
                  Повторить
                </button>
              </div>
            {:else}
              {#key requestedLimit}
                <div
                  class="h-px"
                  aria-hidden="true"
                  {@attach loadMoreOnIntersect}
                ></div>
              {/key}
            {/if}
          {/if}
        {/if}
      </div>
    {/if}
  </div>

  <p class="sr-only" aria-live="polite" aria-atomic="true">
    {announcement}
  </p>
</dialog>
