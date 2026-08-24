import type { APIRoute, GetStaticPaths } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadReview, loadReviews } from '@/lib/reviews/load';
import { buildReviewMarkdown } from '@/lib/reviews/markdown';

export const prerender = true;

export const getStaticPaths = (async () => {
  const reviews = await loadReviews();

  return reviews.map((review) => ({ params: { id: review.id } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;

  if (!id) {
    throw new Error('review id is required');
  }

  const review = await loadReview(id);

  if (!review) {
    throw new Error(`review "${id}" not found`);
  }

  return createMarkdownResponse(buildReviewMarkdown(review));
};
