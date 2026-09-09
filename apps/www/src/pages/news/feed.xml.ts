import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';

import { loadNewsData } from '../../lib/news/load';

export const prerender = true;

export const GET: APIRoute = async (context) => {
  const data = await loadNewsData();

  return rss({
    title: 'Новости Шелково',
    description: 'Новости КП Шелково для собственников: объявления и важные обновления.',
    site: context.site ?? 'https://kpshelkovo.online',
    items: data.articles.map((item) => ({
      title: item.title,
      description: item.summary,
      link: item.url,
      pubDate: item.publishedAt,
      categories: item.tags.map((entry) => entry.label)
    })),
    customData: '<language>ru-RU</language>'
  });
};
