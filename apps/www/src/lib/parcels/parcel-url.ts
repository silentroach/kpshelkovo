export const PARCEL_QUERY_PARAM = 'p';

const queryWithoutParcel = (url: URL): string =>
  // Сохраняем исходные значения и порядок остальных параметров, в том числе флаги без `=`.
  url.search
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

export const getUrlWithParcel = (href: string, code: string): string => {
  const url = new URL(href);
  const query = queryWithoutParcel(url);
  url.search = `${query ? `${query}&` : ''}${PARCEL_QUERY_PARAM}=${encodeURIComponent(code)}`;
  return `${url.pathname}${url.search}${url.hash}`;
};

export const getUrlWithoutParcel = (href: string, expectedCode?: string): string | undefined => {
  const url = new URL(href);
  if (!url.searchParams.has(PARCEL_QUERY_PARAM)) return;
  if ((url.searchParams.get(PARCEL_QUERY_PARAM) || undefined) !== expectedCode) return;

  const query = queryWithoutParcel(url);
  url.search = query ? `?${query}` : '';
  return `${url.pathname}${url.search}${url.hash}`;
};
