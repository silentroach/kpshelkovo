import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { buildReviewsRulesMarkdown } from '@/lib/reviews/markdown';

export const prerender = true;

export const GET: APIRoute = () =>
  createMarkdownResponse(buildReviewsRulesMarkdown());
