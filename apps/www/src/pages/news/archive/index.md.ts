import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadNewsArchives } from '@/lib/news/load';
import { buildNewsArchiveMarkdown } from '@/lib/news/markdown';

export const prerender = true;

export const GET: APIRoute = async () => {
  const archives = await loadNewsArchives();

  return createMarkdownResponse(buildNewsArchiveMarkdown(archives.years));
};
