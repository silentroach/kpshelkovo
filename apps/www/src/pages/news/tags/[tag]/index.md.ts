import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadNewsTag } from '@/lib/news/load';
import { buildNewsTagMarkdown } from '@/lib/news/markdown';
import { newsTagStaticPaths } from '@/lib/news/static-paths';

export const prerender = true;

export const getStaticPaths = newsTagStaticPaths;

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
