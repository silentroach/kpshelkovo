import type { APIRoute, GetStaticPaths } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadNewsTag, loadNewsTags } from '@/lib/news/load';
import { buildNewsTagMarkdown } from '@/lib/news/markdown';

export const prerender = true;

export const getStaticPaths = (async () => {
  const tags = await loadNewsTags();

  return tags.map((item) => ({
    params: { tag: item.key },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const key = params.tag;

  if (!key) {
    throw new Error('news tag key is required');
  }

  const tag = await loadNewsTag(key);

  if (!tag) {
    throw new Error(`news tag page "${key}" not found`);
  }

  return createMarkdownResponse(buildNewsTagMarkdown(tag));
};
