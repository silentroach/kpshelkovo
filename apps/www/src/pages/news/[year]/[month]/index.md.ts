import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadNewsMonth } from '@/lib/news/load';
import { buildNewsMonthMarkdown } from '@/lib/news/markdown';
import { newsMonthStaticPaths } from '@/lib/news/static-paths';

export const prerender = true;

export const getStaticPaths = newsMonthStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const year = Number(params.year);
  const month = Number(params.month);
  const archive = await loadNewsMonth(year, month);

  if (!archive) {
    throw new Error(
      `news month archive "${params.year}/${params.month}" not found`,
    );
  }

  return createMarkdownResponse(buildNewsMonthMarkdown({ archive }));
};
