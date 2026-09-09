import { beforeAll, describe, expect, it } from 'vitest';

import { API_CATALOG_PROFILE } from '../api-catalog-response';

const site = 'https://example.com';
const appRoot = `${site}/astro-base`;
const routes = [
  {
    name: 'root',
    load: () => import('@/pages/.well-known/api-catalog'),
    anchor: `${appRoot}/`,
    selfUrl: `${appRoot}/.well-known/api-catalog`
  },
  {
    name: 'news',
    load: () => import('@/pages/news/.well-known/api-catalog'),
    anchor: `${appRoot}/news/`,
    selfUrl: `${appRoot}/news/.well-known/api-catalog`
  },
  {
    name: 'status',
    load: () => import('@/pages/status/.well-known/api-catalog'),
    anchor: `${appRoot}/status/`,
    selfUrl: `${appRoot}/status/.well-known/api-catalog`
  },
  {
    name: 'people',
    load: () => import('@/pages/people/.well-known/api-catalog'),
    anchor: `${appRoot}/people/index.md`,
    selfUrl: `${appRoot}/people/.well-known/api-catalog`
  },
  {
    name: 'regulation',
    load: () => import('@/pages/815/regulation/.well-known/api-catalog'),
    anchor: `${appRoot}/815/regulation/`,
    selfUrl: `${appRoot}/815/regulation/.well-known/api-catalog`
  },
  {
    name: 'Compare',
    load: () => import('@/pages/815/compare/.well-known/api-catalog'),
    anchor: `${site}/815/compare/`,
    selfUrl: `${site}/815/compare/.well-known/api-catalog`
  }
] as const;

beforeAll(() => {
  Object.assign(import.meta.env, {
    SITE: site,
    BASE_URL: '/astro-base/'
  });
});

describe('api-catalog routes', () => {
  it.each(routes)('preserves the $name GET/HEAD contract', async ({ load, anchor, selfUrl }) => {
    const route = await load();
    const getResponse = await route.GET({} as never);
    const headResponse = await route.HEAD({} as never);
    const body = await getResponse.text();
    const payload = JSON.parse(body) as {
      readonly linkset: readonly { readonly anchor?: string }[];
    };
    const headers = Object.fromEntries(getResponse.headers);

    expect(payload.linkset.map((entry) => entry.anchor)).toContain(anchor);
    expect(body).toBe(JSON.stringify(payload));
    expect(headers).toEqual({
      'content-type': `application/linkset+json; profile="${API_CATALOG_PROFILE}"`,
      link: `<${selfUrl}>; rel="api-catalog"; type="application/linkset+json"; profile="${API_CATALOG_PROFILE}"`
    });
    expect(Object.fromEntries(headResponse.headers)).toEqual(headers);
    expect(await headResponse.text()).toBe('');
  });
});
