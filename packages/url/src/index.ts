const ABSOLUTE_URL_SCHEME = /^(?:https?:|mailto:|tel:)/i;
const TELEGRAM_HOST = /^(?:www\.)?(?:t\.me|telegram\.me)$/i;
const DOMYLAND_HOST = /^(?:[^.]+\.)*domyland\.(?:app|ru)$/i;

export const isAbsoluteUrl = (value: string): boolean =>
  ABSOLUTE_URL_SCHEME.test(value) || value.startsWith('//');

export const isTelegramUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'tg:' ||
      (/^https?:$/i.test(url.protocol) && TELEGRAM_HOST.test(url.hostname))
    );
  } catch {
    return false;
  }
};

export const isDomylandUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return /^https?:$/i.test(url.protocol) && DOMYLAND_HOST.test(url.hostname);
  } catch {
    return false;
  }
};

/**
 * Builds URL with base path prepended.
 * Handles external URLs, anchors, and special protocols.
 */
export function withBase(base: string | undefined, url: string): string {
  if (isAbsoluteUrl(url) || url.startsWith('#')) {
    return url;
  }

  const root = base?.replace(/\/$/, '') ?? '';
  const path = url.startsWith('/') ? url : `/${url}`;

  return `${root}${path}`;
}

export function telegram(handle: string): string {
  const clean = handle.trim().replace(/^@/, '');
  return `https://t.me/${clean}`;
}
