import { padNumber } from '@shelkovo/format';
import type { APIRoute, GetStaticPaths } from 'astro';

import {
  articleEventIcsFilename,
  buildArticleEventIcs,
  hasArticleEvents
} from '@/lib/news/calendar';
import { loadNewsArticle, loadNewsArticles } from '@/lib/news/load';

export const prerender = true;

export const getStaticPaths = (async () => {
  const articles = await loadNewsArticles();

  return articles.filter(hasArticleEvents).flatMap((item) =>
    item.events.map((event) => ({
      params: {
        year: String(item.year),
        month: padNumber(item.month),
        entry: item.entry,
        event: event.slug
      }
    }))
  );
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const year = params.year;
  const month = params.month;
  const entry = params.entry;
  const eventSlug = params.event;

  if (!year || !month || !entry || !eventSlug) {
    throw new Error('news article event params are required');
  }

  const article = await loadNewsArticle(`${year}/${month}/${entry}`);
  const event = article?.events.find((item) => item.slug === eventSlug);

  if (!article || !event) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(buildArticleEventIcs(article, event), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${articleEventIcsFilename(event)}"`
    }
  });
};
