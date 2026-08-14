<script lang="ts">
  import { count, formatDate, pluralize } from '@shelkovo/format';
  import { onMount, tick } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { on } from 'svelte/events';

  import { pagefindSearchClient } from '@/lib/search/client';
  import type { SearchResult } from '@/lib/search/client.types';
  import {
    SEARCH_QUERY_MAX_LENGTH,
    SEARCH_RESULT_DEFAULT_LIMIT,
  } from '@/lib/search/client.types';
  import type {
    SearchDialogProps,
    SearchDialogRequestMode,
    SearchDialogResultRow,
    SearchDialogState,
    SearchExcerptSegment,
  } from './search-dialog.types';

  const SEARCH_TRIGGER_SELECTOR = '[data-search-trigger]';
  const SEARCH_DEBOUNCE_MS = 150;
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
  let resultsElement: HTMLDivElement | undefined;
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

  const hasAnchor = (url: string): boolean => {
    const hashIndex = url.indexOf('#');
    return hashIndex > 0 && hashIndex < url.length - 1;
  };

  const resultRow = (result: SearchResult): SearchDialogResultRow => {
    const anchoredResult = result.subResults.find((item) =>
      hasAnchor(item.url),
    );

    return {
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
    await tick();
    inputElement?.focus();
  };

  const isCurrentVisibleQuery = (requestedQuery: string): boolean =>
    Boolean(dialogElement?.open && query === requestedQuery);

  const beginSearch = (): void => {
    isSearching = true;
    isLoadingMore = false;
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

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
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

    if (event.target === inputElement) {
      event.preventDefault();
      links[0]?.click();
      return;
    }
  };

  const handleDocumentClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const trigger = event.target.closest(SEARCH_TRIGGER_SELECTOR);
    if (!(trigger instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    void openDialog(trigger);
  };

  const excerptSegments = (
    excerptHtml: string,
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

    return segments;
  };

  onMount(() => {
    const removeClickListener = on(document, 'click', handleDocumentClick);
    const removeBeforeSwapListener = on(document, 'astro:before-swap', () => {
      closeDialog(false);
    });

    return () => {
      removeClickListener();
      removeBeforeSwapListener();
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
  onkeydown={handleKeydown}
>
  <div class="flex min-h-0 flex-1 flex-col">
    <header class="border-b border-border px-4 py-4 sm:px-5">
      <div class="flex items-start justify-between gap-4">
        <h2
          id={headingId}
          class="ui-prose-title min-w-0 [overflow-wrap:anywhere]"
        >
          Поиск по сайту
        </h2>
        <button
          type="button"
          class="ui-btn ui-btn-sm ui-btn-ghost shrink-0"
          onclick={() => closeDialog()}
        >
          Закрыть
        </button>
      </div>

      <label for={inputId} class="sr-only">Что найти на сайте</label>
      <input
        bind:this={inputElement}
        bind:value={query}
        id={inputId}
        type="search"
        name="site-search"
        class="mt-4 min-h-12 w-full min-w-0 border border-border bg-surface-raised px-4 py-3 text-base leading-6 text-foreground placeholder:text-muted-foreground"
        placeholder="Новости, статусы, документы"
        autocomplete="off"
        maxlength={SEARCH_QUERY_MAX_LENGTH}
        aria-controls={resultsId}
        oninput={handleInput}
      />
    </header>

    <div
      bind:this={resultsElement}
      id={resultsId}
      class="site-search-dialog__results min-h-0 flex-1 overflow-y-auto"
      role="region"
      aria-label="Результаты поиска"
      aria-busy={isSearching || isLoadingMore}
    >
      {#if viewState === 'initial'}
        <p
          class="max-w-[62ch] px-4 py-8 leading-7 text-muted-foreground sm:px-5"
        >
          Введите запрос, чтобы найти новости, статусы и справочные материалы.
        </p>
      {:else if viewState === 'loading'}
        <p class="px-4 py-8 font-medium text-foreground sm:px-5">Ищем…</p>
      {:else if viewState === 'empty'}
        <div class="space-y-1 px-4 py-8 sm:px-5">
          <p class="font-semibold text-foreground">Ничего не нашли</p>
          <p class="leading-7 text-muted-foreground">
            Попробуйте изменить запрос.
          </p>
        </div>
      {:else if viewState === 'error'}
        <div class="space-y-4 px-4 py-8 sm:px-5">
          <div class="space-y-1">
            <p class="font-semibold text-foreground">
              Поиск сейчас не работает
            </p>
            <p class="leading-7 text-muted-foreground">Попробуйте еще раз.</p>
          </div>
          <button
            type="button"
            class="ui-btn ui-btn-md ui-btn-outline"
            onclick={retrySearch}
          >
            Повторить
          </button>
        </div>
      {:else if viewState === 'dev-unavailable'}
        <div class="space-y-1 px-4 py-8 sm:px-5">
          <p class="font-semibold text-foreground">
            Локальный поиск пока недоступен
          </p>
          <p class="leading-7 text-muted-foreground">
            Подготовьте локальный индекс и обновите страницу.
          </p>
        </div>
      {:else}
        <ul aria-label="Найденные страницы">
          {#each resultRows as row, index (row.result.url)}
            <li class="border-b border-border last:border-b-0">
              <a
                id={`${resultsId}-${index}`}
                href={row.url}
                class="block min-w-0 px-4 py-4 text-foreground hover:bg-primary-soft-2 sm:px-5"
                data-search-result
                onclick={() => closeDialog(false)}
              >
                <span
                  class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm leading-5 text-muted-foreground"
                >
                  <span class="font-semibold">{row.result.section.label}</span>
                  {#if row.result.publishedAt}
                    <time datetime={row.result.publishedAt}>
                      {formatDate(row.result.publishedAt)}
                    </time>
                  {/if}
                </span>
                <h3 class="ui-card-title mt-1.5 [overflow-wrap:anywhere]">
                  {row.result.title}
                </h3>
                {#if row.excerptHtml}
                  {@const segments = excerptSegments(row.excerptHtml)}
                  <p
                    class="site-search-result-excerpt mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-muted-foreground"
                  >
                    {#each segments as segment, segmentIndex (segmentIndex)}
                      {#if segment.highlighted}<mark>{segment.text}</mark
                        >{:else}{segment.text}{/if}
                    {/each}
                  </p>
                {:else if row.result.description}
                  <p
                    class="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-muted-foreground"
                  >
                    {row.result.description}
                  </p>
                {/if}
              </a>
            </li>
          {/each}
        </ul>

        {#if hasMoreResults}
          {#key requestedLimit}
            <div
              class="h-px"
              aria-hidden="true"
              {@attach loadMoreOnIntersect}
            ></div>
          {/key}
        {/if}
      {/if}
    </div>
  </div>

  <p class="sr-only" aria-live="polite" aria-atomic="true">
    {announcement}
  </p>
</dialog>
