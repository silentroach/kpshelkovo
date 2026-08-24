import type { APIRoute, GetStaticPaths } from 'astro';
import { padNumber } from '@shelkovo/format';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadNewsArticle, loadNewsArticles } from '@/lib/news/load';
import { buildNewsArticleMarkdown } from '@/lib/news/markdown';

export const prerender = true;

export const getStaticPaths = (async () => {
  const articles = await loadNewsArticles();

  return articles.map((item) => ({
    params: {
      year: String(item.year),
      month: padNumber(item.month),
      entry: item.entry,
    },
  }));
}) satisfies GetStaticPaths;

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
