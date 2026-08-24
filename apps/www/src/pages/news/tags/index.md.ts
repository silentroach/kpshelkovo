import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadNewsTags } from '@/lib/news/load';
import { buildNewsTagsMarkdown } from '@/lib/news/markdown';

export const prerender = true;

export const GET: APIRoute = async () => {
  const tags = await loadNewsTags();

  return createMarkdownResponse(buildNewsTagsMarkdown(tags));
};
