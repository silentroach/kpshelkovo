import type { APIRoute } from 'astro';

import { catalog, self } from '@/compare/lib/discovery';
import { canonRoot } from '@/compare/lib/site';
import {
  createApiCatalogGetResponse,
  createApiCatalogHeadResponse,
} from '@/lib/api-catalog-response';

export const prerender = true;

export const GET: APIRoute = () => {
  const root = canonRoot();

  return createApiCatalogGetResponse(catalog(root), self(root));
};

export const HEAD: APIRoute = () => {
  const root = canonRoot();

  return createApiCatalogHeadResponse(self(root));
};
