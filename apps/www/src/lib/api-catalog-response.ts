import { createJsonResponse } from './json-response';

export const API_CATALOG_PROFILE = 'https://www.rfc-editor.org/info/rfc9727';

export const formatApiCatalogLink = (url: string): string =>
  `<${url}>; rel="api-catalog"; type="application/linkset+json"; profile="${API_CATALOG_PROFILE}"`;

const responseInit = (selfLink: string): ResponseInit => ({
  headers: {
    'Content-Type': `application/linkset+json; profile="${API_CATALOG_PROFILE}"`,
    Link: selfLink
  }
});

export const createApiCatalogGetResponse = (body: unknown, selfLink: string): Response =>
  createJsonResponse(body, responseInit(selfLink));

export const createApiCatalogHeadResponse = (selfLink: string): Response =>
  new Response(undefined, responseInit(selfLink));
