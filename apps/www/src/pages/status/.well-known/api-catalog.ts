import type { APIRoute } from 'astro';

import {
  createApiCatalogGetResponse,
  createApiCatalogHeadResponse
} from '@/lib/api-catalog-response';
import { canonRoot } from '@/lib/site';
import { catalog, self } from '@/lib/status/discovery';

export const prerender = true;

export const GET: APIRoute = () => {
  const root = canonRoot();

  return createApiCatalogGetResponse(catalog(root), self(root));
};

export const HEAD: APIRoute = () => {
  const root = canonRoot();

  return createApiCatalogHeadResponse(self(root));
};
