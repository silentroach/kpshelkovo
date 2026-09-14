import type { APIRoute } from 'astro';

import { themeColor } from '@/lib/browser-colors';
import { createJsonResponse } from '@/lib/json-response';

export const GET: APIRoute = () =>
  createJsonResponse({
    id: '/',
    name: 'Шелково Онлайн',
    short_name: 'Шелково',
    lang: 'ru',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: themeColor,
    background_color: themeColor,
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
    shortcuts: [
      { name: 'Новости', url: '/news/' },
      { name: 'Статус', url: '/status/' },
      { name: 'База знаний', url: '/kb/' }
    ]
  });
