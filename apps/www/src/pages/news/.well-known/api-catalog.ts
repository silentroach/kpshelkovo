import type { APIRoute } from 'astro';

import {
  createApiCatalogGetResponse,
  createApiCatalogHeadResponse,
} from '@/lib/api-catalog-response';
import { catalog, self } from '@/lib/news/discovery';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = () => {
  const root = canonRoot();

  return createApiCatalogGetResponse(catalog(root), self(root));
};

export const HEAD: APIRoute = () => {
  const root = canonRoot();

  return createApiCatalogHeadResponse(self(root));
};
