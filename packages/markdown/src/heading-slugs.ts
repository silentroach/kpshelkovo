export const headingSlug = (text: string): string => {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/['"«»“”„]/gu, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/gu, '');

  return slug || 'section';
};

export const uniqueHeadingSlug = (
  text: string,
  seenSlugs: Map<string, number>,
): string => {
  const slug = headingSlug(text);
  const count = seenSlugs.get(slug) ?? 0;
  seenSlugs.set(slug, count + 1);

  return count === 0 ? slug : `${slug}-${count + 1}`;
};
