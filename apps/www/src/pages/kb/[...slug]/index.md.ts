import type { APIRoute, GetStaticPaths } from 'astro';

import { loadKbPages } from '@/lib/kb/load';
import { buildKbPageMarkdown } from '@/lib/kb/markdown';
import { createMarkdownResponse } from '@/lib/markdown/response';

export const prerender = true;

export const getStaticPaths = (async () => {
  const pages = await loadKbPages();

  return pages.map((page) => ({ params: { slug: page.routeSlug } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const routeSlug = params.slug;
  const pages = await loadKbPages();
  const page = pages.find((item) => item.routeSlug === routeSlug);

  if (!page) {
    throw new Error(
      routeSlug ? `kb page "${routeSlug}" not found` : 'kb root page not found',
    );
  }

  return createMarkdownResponse(buildKbPageMarkdown(page));
};
