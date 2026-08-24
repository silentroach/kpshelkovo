import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadReviewsData } from '@/lib/reviews/load';
import { buildReviewsHomeMarkdown } from '@/lib/reviews/markdown';

export const prerender = true;

export const GET: APIRoute = async () => {
  const data = await loadReviewsData();

  return createMarkdownResponse(buildReviewsHomeMarkdown(data));
};
