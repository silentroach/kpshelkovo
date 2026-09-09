const VISIBLE_WHITESPACE = {
  nbsp: '·'
} as const;

export const visibleWhitespace = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.replaceAll('\u00A0', VISIBLE_WHITESPACE.nbsp);
  }

  if (Array.isArray(value)) {
    return value.map(visibleWhitespace);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, visibleWhitespace(entry)])
    );
  }

  return value;
};
