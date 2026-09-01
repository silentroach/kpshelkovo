<script lang="ts">
  import { count, formatDate, pluralize } from '@shelkovo/format';
  import SearchIcon from '@shelkovo/ui/icons/system/Search.svelte';
  import { onMount } from 'svelte';
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
  const RESULT_FORMS = ['результат', 'результата', 'результатов'] as const;
  const FOUND_FORMS = ['Найден', 'Найдено', 'Найдено'] as const;

  let { client = pagefindSearchClient, initialQuery = '' }: SearchDialogProps =
    $props();

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

  let query = $derived(initialQuery);
  let viewState = $state<SearchDialogState>('initial');
  let results = $state.raw<readonly SearchResult[]>([]);
  let requestedLimit = $state(SEARCH_RESULT_DEFAULT_LIMIT);
  let total = $state(0);
  let isSearching = $state(false);
  let isLoadingMore = $state(false);
  let loadMoreFailed = $state(false);

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

  const openDialog = (opener: HTMLElement): void => {
    if (!dialogElement) {
      return;
    }

    const queryBeforeHydration = inputElement?.value ?? '';
    const shellAlreadyOpened = dialogElement.open;
    openerElement = opener;
    restoreFocusOnClose = true;
    resetSearch();
    if (queryBeforeHydration) {
      query = queryBeforeHydration;
      if (query.trim()) {
        void client.preload?.(query).catch(() => {});
        scheduleSearch(query);
      }
    }
    if (!shellAlreadyOpened) {
      dialogElement.showModal();
      inputElement?.focus();
    }
    void client.init?.().catch(() => {});
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

    openDialog(event.detail);
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
  data-search-dialog
  data-search-state={viewState}
  onclose={finishClose}
  onclick={handleDialogClick}
  onkeydown={handleKeydown}
>
  <div class="site-search-dialog__surface">
    <h2 id={headingId} class="visually-hidden">Поиск по сайту</h2>
    <div class="site-search-dialog__field">
      <SearchIcon />
      <label for={inputId} class="visually-hidden">Что найти на сайте</label>
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
        data-search-input
        oninput={handleInput}
      />
      <button
        type="button"
        class="site-search-dialog__close"
        aria-label="Закрыть"
        data-search-close
        onclick={() => closeDialog()}
      >
        <svg
          class="close-icon"
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
        class="site-search-dialog__results"
        role="region"
        aria-label="Результаты поиска"
        aria-busy={isSearching || isLoadingMore}
      >
        {#if viewState === 'loading'}
          <p class="state-message">Ищем…</p>
        {:else if viewState === 'empty'}
          <p class="state-message">Ничего не нашли</p>
        {:else if viewState === 'error'}
          <div class="action-row">
            <p class="action-message">Поиск не работает</p>
            <button
              type="button"
              class="ui-btn ui-btn-sm ui-btn-ghost retry-button"
              onclick={retrySearch}
            >
              Повторить
            </button>
          </div>
        {:else if viewState === 'dev-unavailable'}
          <p class="state-message">Локальный поиск недоступен</p>
        {:else}
          <ul aria-label="Найденные страницы">
            {#each resultRows as row, index (row.result.url)}
              <li class="result-item">
                <a
                  id={`${resultsId}-${index}`}
                  href={row.url}
                  class="result-link"
                  data-astro-prefetch="false"
                  data-search-result
                  onclick={handleResultClick}
                >
                  <span class="result-meta">
                    <span class="result-section"
                      >{row.result.section.label}</span
                    >
                    {#if row.result.publishedAt}
                      <time datetime={row.result.publishedAt}>
                        {formatDate(row.result.publishedAt)}
                      </time>
                    {/if}
                  </span>
                  <h3 class="result-title">
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
                        'site-search-result-excerpt result-excerpt',
                        row.result.section.id === 'compare'
                          ? 'result-excerpt--compare'
                          : undefined,
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
                    <p class="site-search-result-excerpt result-excerpt">
                      {row.result.matchContext}
                    </p>
                  {:else if row.result.description}
                    <p class="result-excerpt">
                      {row.result.description}
                    </p>
                  {/if}
                </a>
              </li>
            {/each}
          </ul>

          {#if hasMoreResults}
            {#if loadMoreFailed}
              <div class="action-row" role="status">
                <p class="action-message">
                  Не удалось загрузить остальные результаты
                </p>
                <button
                  type="button"
                  class="ui-btn ui-btn-sm ui-btn-ghost retry-button"
                  onclick={loadMore}
                >
                  Повторить
                </button>
              </div>
            {:else}
              {#key requestedLimit}
                <div
                  class="load-more-sentinel"
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

  <p class="visually-hidden" aria-live="polite" aria-atomic="true">
    {announcement}
  </p>
</dialog>

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    border-width: 0;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .site-search-dialog__field > :global(svg),
  .close-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .site-search-dialog__field > :global(svg) {
    flex-shrink: 0;
    color: var(--color-text-muted);
  }

  .site-search-dialog__results {
    min-height: 0;
    overflow-y: auto;
  }

  .state-message {
    padding: 1rem;
    color: var(--color-text-muted);
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.25rem;
  }

  .action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
  }

  .action-message {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.25rem;
  }

  .retry-button {
    flex-shrink: 0;
  }

  .result-item {
    border-bottom: 1px solid var(--color-border);
  }

  .result-item:last-child {
    border-bottom: 0;
  }

  .result-link {
    display: block;
    min-width: 0;
    padding: 0.75rem 1rem;
    color: var(--color-text);
  }

  .result-link:hover {
    background: var(--color-primary-soft-2);
  }

  .result-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 0.75rem;
    row-gap: 0.25rem;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    line-height: 1.25rem;
  }

  .result-section,
  .result-title {
    font-weight: 600;
  }

  .result-title {
    margin-top: 0.25rem;
    overflow-wrap: anywhere;
    font-size: 1rem;
    line-height: 1.5rem;
  }

  .result-excerpt {
    display: -webkit-box;
    margin-top: 0.25rem;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    color: var(--color-text-muted);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .result-excerpt--compare {
    -webkit-line-clamp: 3;
  }

  .load-more-sentinel {
    height: 1px;
  }

  @media (min-width: 40rem) {
    .result-excerpt--compare {
      -webkit-line-clamp: 2;
    }
  }
</style>
