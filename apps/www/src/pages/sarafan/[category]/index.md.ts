import type { APIRoute, GetStaticPaths } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import {
  loadContactCategories,
  loadContactCategory,
} from '@/lib/contacts/load';
import { buildContactsCategoryMarkdown } from '@/lib/contacts/markdown';

export const prerender = true;

export const getStaticPaths = (async () => {
  const categories = await loadContactCategories();

  return categories.map((category) => ({
    params: { category: category.category },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const key = params.category;

  if (!key) {
    throw new Error('contact category is required');
  }

  const category = await loadContactCategory(key);

  if (!category) {
    throw new Error(`contact category "${key}" not found`);
  }

  return createMarkdownResponse(buildContactsCategoryMarkdown(category));
};
