import type { APIRoute } from 'astro';

import { loadNewsArchives } from '@/lib/news/load';
import {
  buildNewsArchiveMarkdown,
  NEWS_MARKDOWN_HEADERS,
} from '@/lib/news/markdown';

export const prerender = true;

export const GET: APIRoute = async () => {
  const archives = await loadNewsArchives();

  return new Response(buildNewsArchiveMarkdown(archives.years), {
    headers: NEWS_MARKDOWN_HEADERS,
  });
};
