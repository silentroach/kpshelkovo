import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  SearchClient,
  SearchResponse,
  SearchResult,
} from '@/lib/search/client.types';
import SearchDialog from '../SearchDialog.svelte';

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly reject: (reason?: unknown) => void;
  readonly resolve: (value: T) => void;
}

const SEARCH_DEBOUNCE_MS = 150;

const deferred = <T>(): Deferred<T> => {
  let rejectPromise: (reason?: unknown) => void = () => {};
  let resolvePromise: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    rejectPromise = reject;
    resolvePromise = resolve;
  });

  return { promise, reject: rejectPromise, resolve: resolvePromise };
};

const resultAt = (index: number): SearchResult => ({
  url: `/news/result-${index}/`,
  title: `Результат ${index}`,
  section: {
    id: 'news',
    label: 'Новости',
  },
  publishedAt: index === 1 ? '2026-08-14' : undefined,
  excerptHtml:
    index === 1
      ? 'Совпало <mark>слово</mark> и &lt;script&gt;alert(1)&lt;/script&gt;'
      : undefined,
  subResults: [],
});

const readyResponse = (
  query: string,
  results: readonly SearchResult[],
  total = results.length,
): SearchResponse => ({
  state: 'ready',
  query,
  results,
  total,
});

const addOpener = (label: string): HTMLButtonElement => {
  const opener = document.createElement('button');
  opener.type = 'button';
  opener.textContent = label;
  opener.dataset.searchTrigger = '';
  opener.dataset.searchTestOpener = '';
  document.body.append(opener);

  return opener;
};

const dialogFrom = (container: HTMLElement): HTMLDialogElement => {
  const dialog = container.querySelector('dialog');
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error('Search dialog was not rendered');
  }

  return dialog;
};

const enterDebouncedQuery = async (
  input: HTMLElement,
  value: string,
): Promise<void> => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  await fireEvent.input(input, { target: { value } });
  vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
  vi.useRealTimers();
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document
    .querySelectorAll('[data-search-test-opener]')
    .forEach((element) => element.remove());
});

describe('SearchDialog', () => {
  it('initializes on open and preloads input without surfacing optimization failures', async () => {
    const init = vi.fn(async () => {
      throw new Error('Pagefind init failed');
    });
    const preload = vi.fn(async () => {
      throw new Error('Pagefind preload failed');
    });
    const search = vi.fn(async (query: string) =>
      readyResponse(query, [resultAt(1)]),
    );
    const client: SearchClient = { init, preload, search };
    const opener = addOpener('Поиск');
    const view = render(SearchDialog, { props: { client } });
    const dialog = dialogFrom(view.container);

    expect(init).not.toHaveBeenCalled();
    await fireEvent.click(opener);
    const input = view.getByRole('searchbox', { name: 'Что найти на сайте' });
    await waitFor(() => expect(init).toHaveBeenCalledOnce());

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await fireEvent.input(input, { target: { value: '   ' } });
    await fireEvent.input(input, { target: { value: 'вод' } });
    await fireEvent.input(input, { target: { value: 'вода' } });

    expect(preload.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "вод",
        ],
        [
          "вода",
        ],
      ]
    `);
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    vi.useRealTimers();

    await waitFor(() => expect(dialog.dataset.searchState).toBe('results'));
    expect(search).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith('вода', 8);
  });

  it('opens lazily from the delegated trigger and restores the exact opener', async () => {
    const search = vi.fn(async () => readyResponse('', []));
    const client: SearchClient = { search };
    const firstOpener = addOpener('Первый поиск');
    const secondOpener = addOpener('Второй поиск');
    const view = render(SearchDialog, { props: { client } });
    const dialog = dialogFrom(view.container);

    expect(search).not.toHaveBeenCalled();
    expect(dialog.open).toBe(false);

    await fireEvent.click(secondOpener);

    const input = view.getByRole('searchbox', { name: 'Что найти на сайте' });
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(dialog.open).toBe(true);
    expect(input.getAttribute('placeholder')).toBe('Что найти?');
    expect(
      view.queryByRole('region', { name: 'Результаты поиска' }),
    ).toBeNull();
    expect(
      view.queryByText(
        'Введите запрос, чтобы найти новости, статусы и справочные материалы.',
      ),
    ).toBeNull();
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(
      dialog.querySelector('[aria-live="polite"][aria-atomic="true"]'),
    ).toBeTruthy();

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await fireEvent.input(input, { target: { value: 'отмена' } });
    await fireEvent.input(input, { target: { value: '   ' } });
    expect(dialog.dataset.searchState).toBe('initial');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(search).not.toHaveBeenCalled();
    expect(dialog.dataset.searchState).toBe('initial');

    await fireEvent.input(input, { target: { value: 'закрыть' } });
    await fireEvent.keyDown(input, { key: 'Escape' });
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    vi.useRealTimers();
    expect(dialog.open).toBe(false);
    expect(search).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(secondOpener);

    await fireEvent.click(firstOpener);
    await waitFor(() => expect(document.activeElement).toBe(input));
    await fireEvent.click(dialog);
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(firstOpener);
  });

  it('renders trusted results progressively and supports arrows and Enter', async () => {
    const intersections: Array<() => void> = [];
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        readonly root = null;
        readonly rootMargin = '0px';
        readonly scrollMargin = '0px';
        readonly thresholds: readonly number[] = [];

        constructor(callback: IntersectionObserverCallback) {
          intersections.push(() =>
            callback(
              [{ isIntersecting: true } as IntersectionObserverEntry],
              this,
            ),
          );
        }

        readonly disconnect = disconnect;
        readonly observe = observe;
        readonly takeRecords = (): IntersectionObserverEntry[] => [];
        readonly unobserve = vi.fn();
      },
    );
    const initialPending = deferred<SearchResponse | undefined>();
    const firstExpansion = deferred<SearchResponse | undefined>();
    const failedSecondExpansion = deferred<SearchResponse | undefined>();
    const retriedSecondExpansion = deferred<SearchResponse | undefined>();
    let secondExpansionRequests = 0;
    const search = vi.fn(
      (_query: string, limit?: number): Promise<SearchResponse | undefined> => {
        switch (limit) {
          case 8:
            return initialPending.promise;
          case 16:
            return firstExpansion.promise;
          case 24:
            secondExpansionRequests += 1;
            return secondExpansionRequests === 1
              ? failedSecondExpansion.promise
              : retriedSecondExpansion.promise;
          default:
            return Promise.reject(new Error(`Unexpected limit: ${limit}`));
        }
      },
    );
    const client: SearchClient = { search };
    const opener = addOpener('Поиск');
    const view = render(SearchDialog, { props: { client } });
    const dialog = dialogFrom(view.container);

    await fireEvent.click(opener);
    const input = view.getByRole('searchbox', { name: 'Что найти на сайте' });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await fireEvent.input(input, { target: { value: 'вод' } });
    await fireEvent.input(input, { target: { value: 'вода' } });

    expect(search).not.toHaveBeenCalled();
    expect(dialog.dataset.searchState).toBe('loading');
    expect(
      view
        .getByRole('region', { name: 'Результаты поиска' })
        .getAttribute('aria-busy'),
    ).toBe('true');

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    expect(search).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    vi.useRealTimers();
    expect(search).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith('вода', 8);

    initialPending.resolve(
      readyResponse(
        'вода',
        Array.from({ length: 8 }, (_, index) => resultAt(index + 1)),
        18,
      ),
    );

    await waitFor(() => expect(view.getAllByRole('link')).toHaveLength(8));
    const firstResult = view.getAllByRole('link')[0];
    expect(firstResult?.getAttribute('href')).toBe('/news/result-1/');
    expect(firstResult?.querySelector('time')?.dateTime).toBe('2026-08-14');
    expect(firstResult?.querySelector('mark')?.textContent).toBe('слово');
    expect(firstResult?.querySelector('script')).toBeNull();
    expect(firstResult?.tabIndex).toBe(0);
    expect(dialog.dataset.searchState).toBe('results');
    expect(
      dialog.querySelector('[aria-live="polite"]')?.textContent?.trim(),
    ).toBe('Найдено 18 результатов');

    const tabEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab',
    });
    input.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(false);

    expect(observe).toHaveBeenCalledOnce();
    intersections[0]?.();

    await waitFor(() => expect(search).toHaveBeenLastCalledWith('вода', 16));
    expect(view.getAllByRole('link')).toHaveLength(8);
    intersections[0]?.();
    expect(search).toHaveBeenCalledTimes(2);

    firstExpansion.resolve(
      readyResponse(
        'вода',
        Array.from({ length: 14 }, (_, index) => resultAt(index + 1)),
        18,
      ),
    );
    await waitFor(() => expect(view.getAllByRole('link')).toHaveLength(14));

    expect(disconnect).toHaveBeenCalled();
    expect(observe).toHaveBeenCalledTimes(2);
    intersections[1]?.();
    await waitFor(() => expect(search).toHaveBeenLastCalledWith('вода', 24));
    expect(view.getAllByRole('link')).toHaveLength(14);

    failedSecondExpansion.reject(new Error('Pagefind fragment failed'));
    const retryButton = await waitFor(() =>
      view.getByRole('button', { name: 'Повторить' }),
    );
    expect(view.getAllByRole('link')).toHaveLength(14);

    await fireEvent.click(retryButton);
    await waitFor(() => expect(search).toHaveBeenLastCalledWith('вода', 24));
    retriedSecondExpansion.resolve(
      readyResponse(
        'вода',
        Array.from({ length: 16 }, (_, index) => resultAt(index + 1)),
        18,
      ),
    );
    await waitFor(() => expect(view.getAllByRole('link')).toHaveLength(16));
    expect(observe).toHaveBeenCalledTimes(3);

    input.focus();
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(view.getAllByRole('link')[0]);
    await fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: 'ArrowDown',
    });
    expect(document.activeElement).toBe(view.getAllByRole('link')[1]);
    await fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: 'ArrowUp',
    });
    expect(document.activeElement).toBe(view.getAllByRole('link')[0]);

    const activatedResult = view.getAllByRole('link')[0];
    const activation = vi.fn((event: Event) => event.preventDefault());
    activatedResult?.addEventListener('click', activation);
    input.focus();
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(activation).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).not.toBe(opener);
  });

  it('keeps current results visible without activating them during a refined search', async () => {
    const refinedSearch = deferred<SearchResponse | undefined>();
    const search = vi.fn(
      (query: string): Promise<SearchResponse | undefined> =>
        query === 'вода горячая'
          ? refinedSearch.promise
          : Promise.resolve(readyResponse(query, [resultAt(1)])),
    );
    const client: SearchClient = { search };
    const opener = addOpener('Поиск');
    const view = render(SearchDialog, { props: { client } });
    const dialog = dialogFrom(view.container);

    await fireEvent.click(opener);
    const input = view.getByRole('searchbox', { name: 'Что найти на сайте' });
    await enterDebouncedQuery(input, 'вода');
    const resultsRegion = view.getByRole('region', {
      name: 'Результаты поиска',
    });
    await waitFor(() => expect(view.getByRole('link')).toBeTruthy());

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await fireEvent.input(input, { target: { value: 'вода горячая' } });

    expect(dialog.dataset.searchState).toBe('results');
    expect(resultsRegion.getAttribute('aria-busy')).toBe('true');
    expect(view.getByRole('link').getAttribute('href')).toBe('/news/result-1/');
    expect(view.queryByText('Ищем…')).toBeNull();

    const staleResultActivation = vi.fn((event: Event) =>
      event.preventDefault(),
    );
    view.getByRole('link').addEventListener('click', staleResultActivation);
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(staleResultActivation).not.toHaveBeenCalled();
    expect(dialog.open).toBe(true);

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    vi.useRealTimers();
    expect(search).toHaveBeenLastCalledWith('вода горячая', 8);
    expect(view.getByRole('link').getAttribute('href')).toBe('/news/result-1/');

    refinedSearch.resolve(readyResponse('вода горячая', [resultAt(2)]));
    await waitFor(() =>
      expect(view.getByRole('link').getAttribute('href')).toBe(
        '/news/result-2/',
      ),
    );
    expect(resultsRegion.getAttribute('aria-busy')).toBe('false');
  });

  it('leaves focused result navigation native and only closes for the current tab', async () => {
    const search = vi.fn(async (query: string) =>
      readyResponse(query, [resultAt(1)]),
    );
    const client: SearchClient = { search };
    const opener = addOpener('Поиск');
    const view = render(SearchDialog, { props: { client } });
    const dialog = dialogFrom(view.container);

    await fireEvent.click(opener);
    const input = view.getByRole('searchbox', { name: 'Что найти на сайте' });
    await enterDebouncedQuery(input, 'вода');
    const resultLink = await waitFor(() => view.getByRole('link'));
    resultLink.focus();

    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    await fireEvent(resultLink, enterEvent);

    expect(enterEvent.defaultPrevented).toBe(false);
    expect(dialog.open).toBe(true);

    await fireEvent.click(resultLink, { ctrlKey: true });
    await fireEvent.click(resultLink, { button: 1 });
    expect(dialog.open).toBe(true);
    expect((input as HTMLInputElement).value).toBe('вода');

    const activation = vi.fn((event: Event) => event.preventDefault());
    resultLink.addEventListener('click', activation);
    await fireEvent.click(resultLink);

    expect(activation).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).not.toBe(opener);
  });

  it('leaves search keyboard handling inactive during IME composition', async () => {
    const search = vi.fn(async (query: string) =>
      readyResponse(query, [resultAt(1)]),
    );
    const client: SearchClient = { search };
    const opener = addOpener('Поиск');
    const view = render(SearchDialog, { props: { client } });
    const dialog = dialogFrom(view.container);

    await fireEvent.click(opener);
    const input = view.getByRole('searchbox', { name: 'Что найти на сайте' });
    await enterDebouncedQuery(input, 'вода');
    const resultLink = await waitFor(() => view.getByRole('link'));
    const activation = vi.fn((event: Event) => event.preventDefault());
    resultLink.addEventListener('click', activation);
    input.focus();

    await fireEvent.keyDown(input, { key: 'ArrowDown', isComposing: true });
    await fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    await fireEvent.keyDown(input, { key: 'Escape', isComposing: true });

    expect(document.activeElement).toBe(input);
    expect(activation).not.toHaveBeenCalled();
    expect(dialog.open).toBe(true);
  });

  it('uses an anchored sub-result and a plain description fallback', async () => {
    const anchoredResult: SearchResult = {
      url: '/news/long-page/',
      title: 'Основная страница',
      section: { id: 'news', label: 'Новости' },
      excerptHtml: 'Текст страницы с <mark>совпадением</mark>',
      subResults: [
        {
          url: '/news/long-page/#',
          title: 'Пустой якорь',
          excerptHtml: 'Этот фрагмент не подходит',
        },
        {
          url: '/news/long-page/#details',
          title: 'Детали',
          excerptHtml: 'Якорный <mark>фрагмент</mark>',
        },
      ],
    };
    const describedResult: SearchResult = {
      url: '/status/water/',
      title: 'Статус воды',
      description: 'Описание <strong>остается текстом</strong>',
      section: { id: 'status', label: 'Статус' },
      subResults: [],
    };
    const search = vi.fn(async (query: string) =>
      readyResponse(query, [anchoredResult, describedResult]),
    );
    const client: SearchClient = { search };
    const opener = addOpener('Поиск');
    const view = render(SearchDialog, { props: { client } });

    await fireEvent.click(opener);
    const input = view.getByRole('searchbox', { name: 'Что найти на сайте' });
    await enterDebouncedQuery(input, 'детали');
    await waitFor(() => expect(view.getAllByRole('link')).toHaveLength(2));

    const [anchoredLink, describedLink] = view.getAllByRole('link');
    expect(anchoredLink?.getAttribute('href')).toBe('/news/long-page/#details');
    expect(anchoredLink?.getAttribute('data-astro-prefetch')).toBe('false');
    expect(anchoredLink?.querySelector('h3')?.textContent?.trim()).toBe(
      'Основная страница',
    );
    expect(anchoredLink?.querySelector('mark')?.textContent).toBe('фрагмент');
    expect(describedLink?.textContent).toContain(
      'Описание <strong>остается текстом</strong>',
    );
    expect(describedLink?.querySelector('strong')).toBeNull();
  });

  it('handles empty, unavailable, current errors, and stale thrown errors', async () => {
    const staleRequest = deferred<SearchResponse | undefined>();
    const search = vi.fn(
      (query: string): Promise<SearchResponse | undefined> => {
        switch (query) {
          case 'пусто':
            return Promise.resolve(readyResponse(query, []));
          case 'разработка':
            return Promise.resolve({ state: 'devUnavailable', query });
          case 'ошибка':
            return Promise.reject(new Error('Pagefind failed'));
          case 'старый':
            return staleRequest.promise;
          case 'новый':
            return Promise.resolve(readyResponse(query, [resultAt(20)]));
          default:
            return Promise.resolve(readyResponse(query, []));
        }
      },
    );
    const client: SearchClient = { search };
    const opener = addOpener('Поиск');
    const view = render(SearchDialog, { props: { client } });
    const dialog = dialogFrom(view.container);

    await fireEvent.click(opener);
    const input = view.getByRole('searchbox', { name: 'Что найти на сайте' });

    await enterDebouncedQuery(input, 'пусто');
    await waitFor(() => expect(dialog.dataset.searchState).toBe('empty'));

    await enterDebouncedQuery(input, 'разработка');
    await waitFor(() =>
      expect(dialog.dataset.searchState).toBe('dev-unavailable'),
    );
    expect(
      view
        .getByRole('region', { name: 'Результаты поиска' })
        .getAttribute('aria-busy'),
    ).toBe('false');

    await enterDebouncedQuery(input, 'ошибка');
    await waitFor(() => expect(dialog.dataset.searchState).toBe('error'));

    await enterDebouncedQuery(input, 'старый');
    await enterDebouncedQuery(input, 'новый');
    await waitFor(() => expect(dialog.dataset.searchState).toBe('results'));
    expect(view.getByRole('link').getAttribute('href')).toBe(
      '/news/result-20/',
    );

    staleRequest.reject(new Error('Old Pagefind failure'));
    await waitFor(() => expect(dialog.dataset.searchState).toBe('results'));
    expect(view.getByRole('link').getAttribute('href')).toBe(
      '/news/result-20/',
    );
  });

  it('closes before an Astro swap without focusing the outgoing opener', async () => {
    const search = vi.fn(async (query: string) => readyResponse(query, []));
    const client: SearchClient = { search };
    const opener = addOpener('Поиск');
    const view = render(SearchDialog, { props: { client } });
    const dialog = dialogFrom(view.container);

    await fireEvent.click(opener);
    const input = view.getByRole('searchbox', { name: 'Что найти на сайте' });
    await waitFor(() => expect(document.activeElement).toBe(input));

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await fireEvent.input(input, { target: { value: 'до перехода' } });
    await fireEvent(document, new Event('astro:before-swap'));
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    vi.useRealTimers();

    expect(dialog.open).toBe(false);
    expect(search).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(opener);
    expect(dialog.dataset.searchState).toBe('initial');

    await fireEvent.click(opener);
    await waitFor(() => expect(document.activeElement).toBe(input));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await fireEvent.input(input, { target: { value: 'до удаления' } });
    view.unmount();
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(search).not.toHaveBeenCalled();
  });
});
