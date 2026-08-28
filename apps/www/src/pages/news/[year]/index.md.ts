import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadNewsArchives } from '@/lib/news/load';
import { buildNewsYearMarkdown } from '@/lib/news/markdown';
import { newsYearStaticPaths } from '@/lib/news/static-paths';

export const prerender = true;

export const getStaticPaths = newsYearStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const year = Number(params.year);
  const archives = await loadNewsArchives();
  const archive = archives.byYear.get(year);

  if (!archive) {
    throw new Error(`news year archive "${params.year}" not found`);
  }

  return createMarkdownResponse(buildNewsYearMarkdown({ archive }));
};
