import { createJsonResponse } from './json-response';

const responseInit = (selfLink: string): ResponseInit => ({
  headers: {
    'Content-Type':
      'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
    Link: selfLink,
  },
});

export const createApiCatalogGetResponse = (
  body: unknown,
  selfLink: string,
): Response => createJsonResponse(body, responseInit(selfLink));

export const createApiCatalogHeadResponse = (selfLink: string): Response =>
  new Response(undefined, responseInit(selfLink));
