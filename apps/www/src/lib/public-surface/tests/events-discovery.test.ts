import { expect, it } from 'vitest';
import { z } from 'zod';

import { catalog } from '@/lib/discovery';
import { build } from '@/lib/llms';
import { llmsPathForPage, publicSurfaceRegistry } from '@/lib/public-surface';

it('discovers the full events feed and schema through the root catalog and guide', () => {
  const link = z.object({ href: z.url(), type: z.string() });
  const payload = z
    .object({
      linkset: z.array(
        z.object({
          anchor: z.url(),
          item: z.array(link).optional(),
          'service-desc': z.array(link).optional()
        })
      )
    })
    .parse(catalog('https://example.com'));
  const events = payload.linkset.find((entry) => entry.anchor === 'https://example.com/events/');
  expect(events).toMatchInlineSnapshot(`
    {
      "anchor": "https://example.com/events/",
      "item": [
        {
          "href": "https://example.com/events/index.md",
          "type": "text/markdown",
        },
        {
          "href": "https://example.com/events/events.json",
          "type": "application/json",
        },
      ],
      "service-desc": [
        {
          "href": "https://example.com/events/schemas/events.schema.json",
          "type": "application/schema+json",
        },
      ],
    }
  `);
  const guide = build();
  for (const path of [
    '/events/',
    '/events/index.md',
    '/events/events.json',
    '/events/schemas/events.schema.json'
  ]) {
    expect(guide).toContain(`](https://kpshelkovo.online${path})`);
  }
  expect(guide).not.toMatch(/apps\/www|src\/data|\/events\/llms\.txt/);
});

it('registers all event route families with Markdown negotiation and the root guide', () => {
  const surfaces = publicSurfaceRegistry.surfacesByOwner('events');
  expect(surfaces.map((surface) => surface.path ?? surface.routePattern)).toMatchInlineSnapshot(`
    [
      "/events/",
      "/events/index.md",
      "/events/:year/:month/",
      "/events/:year/:month/index.md",
      "/events/:year/:month/list/",
      "/events/:year/:month/list/index.md",
      "/events/:year/:month/:day/",
      "/events/:year/:month/:day/index.md",
      "/events/events.json",
      "/events/schemas/events.schema.json",
      "/events/calendar/:id.ics",
    ]
  `);
  for (const surface of surfaces.filter((item) => item.mediaType === 'text/html')) {
    const path = surface.path ?? surface.routePattern;
    expect(surface.acceptsNegotiation).toBe('required');
    expect(surface.linkRelations).toEqual([
      { rel: 'alternate', href: `${path}index.md`, mediaType: 'text/markdown' },
      { rel: 'describedby', href: llmsPathForPage(path), mediaType: 'text/plain' }
    ]);
  }
});
