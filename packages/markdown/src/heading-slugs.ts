export const headingSlug = (text: string): string => {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/['"«»“”„]/gu, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/gu, '');

  return slug || 'section';
};

export const uniqueHeadingSlug = (text: string, usedIds: Set<string>): string => {
  const base = headingSlug(text);
  let slug = base;
  let suffix = 2;

  while (usedIds.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(slug);
  return slug;
};
