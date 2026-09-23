export const PARCEL_QUERY_PARAM = 'p';

export const getUrlWithoutParcel = (href: string, expectedCode?: string): string | undefined => {
  const url = new URL(href);
  if (!url.searchParams.has(PARCEL_QUERY_PARAM)) return;
  if ((url.searchParams.get(PARCEL_QUERY_PARAM) || undefined) !== expectedCode) return;

  // Сохраняем исходные значения и порядок остальных параметров, в том числе флаги без `=`.
  const query = url.search
    .slice(1)
    .split('&')
    .filter((part) => {
      const separator = part.indexOf('=');
      const name = separator === -1 ? part : part.slice(0, separator);
      try {
        return decodeURIComponent(name.replaceAll('+', ' ')) !== PARCEL_QUERY_PARAM;
      } catch {
        return true;
      }
    })
    .join('&');
  url.search = query ? `?${query}` : '';
  return `${url.pathname}${url.search}${url.hash}`;
};
