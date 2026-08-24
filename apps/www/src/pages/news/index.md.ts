import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadNewsData } from '../../lib/news/load';
import { buildNewsHomeMarkdown } from '../../lib/news/markdown';

export const prerender = true;

export const GET: APIRoute = async () => {
  const data = await loadNewsData();

  return createMarkdownResponse(buildNewsHomeMarkdown(data));
};
