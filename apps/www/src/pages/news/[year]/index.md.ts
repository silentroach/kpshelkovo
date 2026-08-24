import type { APIRoute, GetStaticPaths } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadNewsArchives } from '@/lib/news/load';
import { buildNewsYearMarkdown } from '@/lib/news/markdown';

export const prerender = true;

export const getStaticPaths = (async () => {
  const archives = await loadNewsArchives();

  return archives.years.map((item) => ({
    params: { year: String(item.year) },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const year = Number(params.year);
  const archives = await loadNewsArchives();
  const archive = archives.byYear.get(year);

  if (!archive) {
    throw new Error(`news year archive "${params.year}" not found`);
  }

  return createMarkdownResponse(buildNewsYearMarkdown({ archive }));
};
