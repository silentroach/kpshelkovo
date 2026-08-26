import type { APIRoute } from 'astro';

import { fullReglamentDataset2026 } from '@/data/reglament/full-2026';
import { projectPublicFullReglamentDataset } from '@/lib/reglament/full-public-projector';
import { validatePublicFullReglamentDataset } from '@/lib/reglament/full-public-validator';
import { reglamentApiCatalogPath } from '@/lib/reglament/routes';
import { canonRoot } from '@/lib/site';

export const prerender = true;

const abs = (root: string, path: string): string =>
  new URL(path.replace(/^\//, ''), `${root}/`).toString();

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const publicDataset = projectPublicFullReglamentDataset(
    fullReglamentDataset2026,
  );
  const body = JSON.stringify(
    validatePublicFullReglamentDataset(publicDataset),
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Link: `<${abs(root, reglamentApiCatalogPath())}>; rel="api-catalog"; type="application/linkset+json"`,
    },
  });
};
