import { describe, expect, it } from 'vitest';

import { createJsonResponse } from '../json-response';

describe('createJsonResponse', () => {
  it('preserves the compact JSON response contract', async () => {
    const response = createJsonResponse(
      { version: 1, items: ['first', 'second'] },
      {
        headers: {
          'Content-Type': 'application/linkset+json; profile="https://example.com/profile"',
          Link: '<https://example.com/catalog>; rel="self"'
        }
      }
    );

    expect({
      body: await response.text(),
      headers: Object.fromEntries(response.headers),
      status: response.status
    }).toMatchInlineSnapshot(`
      {
        "body": "{\"version\":1,\"items\":[\"first\",\"second\"]}",
        "headers": {
          "content-type": "application/linkset+json; profile=\"https://example.com/profile\"",
          "link": "<https://example.com/catalog>; rel=\"self\"",
        },
        "status": 200,
      }
    `);
  });
});
