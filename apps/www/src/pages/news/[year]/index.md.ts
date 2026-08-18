import type { APIRoute, GetStaticPaths } from 'astro';

import { loadNewsArchives } from '@/lib/news/load';
import {
  buildNewsYearMarkdown,
  NEWS_MARKDOWN_HEADERS,
} from '@/lib/news/markdown';

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

  return new Response(
    buildNewsYearMarkdown({ archive, years: archives.years }),
    {
      headers: NEWS_MARKDOWN_HEADERS,
    },
  );
};
