import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadNewsArticle } from '@/lib/news/load';
import { buildNewsArticleMarkdown } from '@/lib/news/markdown';
import { newsArticleStaticPaths } from '@/lib/news/static-paths';

export const prerender = true;

export const getStaticPaths = newsArticleStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const year = params.year;
  const month = params.month;
  const entry = params.entry;

  if (!year || !month || !entry) {
    throw new Error('news article params are required');
  }

  const article = await loadNewsArticle(`${year}/${month}/${entry}`);

  if (!article) {
    throw new Error(`news article "${year}/${month}/${entry}" not found`);
  }

  return createMarkdownResponse(buildNewsArticleMarkdown(article));
};
