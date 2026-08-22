import type { APIRoute } from 'astro';

import { loadDiscomfortData } from '@/lib/discomfort/load';
import {
  buildDiscomfortMarkdown,
  DISCOMFORT_MARKDOWN_HEADERS,
} from '@/lib/discomfort/markdown';

export const prerender = true;

export const GET: APIRoute = async () => {
  const data = await loadDiscomfortData();

  return new Response(buildDiscomfortMarkdown(data), {
    headers: DISCOMFORT_MARKDOWN_HEADERS,
  });
};
