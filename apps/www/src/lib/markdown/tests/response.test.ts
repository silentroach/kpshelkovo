import { describe, expect, it } from 'vitest';

import { createMarkdownResponse } from '../response';

describe('createMarkdownResponse', () => {
  it('preserves the markdown response contract', async () => {
    const response = createMarkdownResponse('# Markdown');

    expect({
      body: await response.text(),
      headers: Object.fromEntries(response.headers),
      status: response.status,
    }).toMatchInlineSnapshot(`
      {
        "body": "# Markdown",
        "headers": {
          "content-type": "text/markdown; charset=utf-8",
          "x-robots-tag": "noindex, follow",
        },
        "status": 200,
      }
    `);
  });
});
