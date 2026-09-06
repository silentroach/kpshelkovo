import { describe, expect, it } from 'vitest';

import {
  createApiCatalogGetResponse,
  createApiCatalogHeadResponse,
} from '../api-catalog-response';

const link =
  '<https://example.com/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"; profile="https://www.rfc-editor.org/info/rfc9727"';

describe('api-catalog response', () => {
  it.each([
    [
      'GET',
      () =>
        createApiCatalogGetResponse(
          { version: 1, items: ['first', 'second'] },
          link,
        ),
    ],
    ['HEAD', () => createApiCatalogHeadResponse(link)],
  ] as const)('preserves the %s contract', async (_method, createResponse) => {
    const response = createResponse();

    expect({
      body: await response.text(),
      headers: Object.fromEntries(response.headers),
      status: response.status,
    }).toMatchSnapshot();
  });
});
