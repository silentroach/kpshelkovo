import { SEARCH_QUERY_MAX_LENGTH } from './client.types';
import type {
  PagefindHighlightConstructor,
  PagefindHighlightLoader,
  PagefindHighlightModule,
} from './highlight.types';

export const SEARCH_HIGHLIGHT_PARAM = 'h';

const pagefindHighlightEntrypoint = '/search/pagefind-highlight.js';
const searchHighlightMaxTerms = 20;

export const normalizeSearchHighlightQuery = (search: string): string => {
  const rawValues = new URLSearchParams(search).getAll(SEARCH_HIGHLIGHT_PARAM);
  const values = [
    ...new Set(rawValues.filter((value) => Array.from(value).length > 1)),
  ];
  const combinedLength = Array.from(values.join(' ')).length;
  if (
    !values.length ||
    values.length > searchHighlightMaxTerms ||
    combinedLength > SEARCH_QUERY_MAX_LENGTH ||
    rawValues.some((value) => !value.trim())
  ) {
    return '';
  }

  const params = new URLSearchParams();
  values.forEach((value) => params.append(SEARCH_HIGHLIGHT_PARAM, value));

  return `?${params.toString()}`;
};

const loadGeneratedPagefindHighlight =
  async (): Promise<PagefindHighlightConstructor> => {
    const pagefindHighlight: PagefindHighlightModule = await import(
      /* @vite-ignore */ pagefindHighlightEntrypoint
    );

    return pagefindHighlight.default;
  };

export const highlightSearchTerms = async (
  href: string,
  loadPagefindHighlight: PagefindHighlightLoader = loadGeneratedPagefindHighlight,
): Promise<void> => {
  if (!normalizeSearchHighlightQuery(new URL(href).search)) {
    return;
  }

  const PagefindHighlight = await loadPagefindHighlight();
  if (location.href !== href) {
    return;
  }

  new PagefindHighlight({
    addStyles: false,
    highlightParam: SEARCH_HIGHLIGHT_PARAM,
  });
};
