export const PLACE_HIGHLIGHT_QUERY_PARAM = 'h';

export const getUrlWithoutPlaceHighlight = (
  href: string,
  expectedSlug?: string,
): string | undefined => {
  const url = new URL(href);

  if (!url.searchParams.has(PLACE_HIGHLIGHT_QUERY_PARAM)) return;

  const currentSlug =
    url.searchParams.get(PLACE_HIGHLIGHT_QUERY_PARAM) || undefined;

  if (currentSlug !== expectedSlug) return;

  const query = url.search
    .slice(1)
    .split('&')
    .filter((part) => {
      const separator = part.indexOf('=');
      const encodedName = separator === -1 ? part : part.slice(0, separator);

      try {
        return (
          decodeURIComponent(encodedName.replaceAll('+', ' ')) !==
          PLACE_HIGHLIGHT_QUERY_PARAM
        );
      } catch {
        return true;
      }
    })
    .join('&');

  url.search = query ? `?${query}` : '';
  return `${url.pathname}${url.search}${url.hash}`;
};
