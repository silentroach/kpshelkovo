import { describe, expect, it } from 'vitest';

import { mergeVary, renderStaticResponseMetadata } from '../static-response-metadata';
import type { StaticEndpointRoute, StaticResponseHeaders } from '../static-response-metadata.types';

const response = (
  pathname: string,
  headers: HeadersInit,
  type: StaticEndpointRoute['type'] = 'endpoint',
  isPrerendered = true,
  redirect?: StaticEndpointRoute['redirect']
): StaticResponseHeaders =>
  new Map([
    [
      pathname,
      {
        headers: new Headers(headers),
        route: { type, isPrerendered, redirect, entrypoint: 'src/pages/document.ts' }
      }
    ]
  ]);

describe('static endpoint response metadata', () => {
  it('uses concrete endpoint paths and excludes pages, runtime routes and redirects', () => {
    const config = renderStaticResponseMetadata(
      new Map([
        ...response('/new/документ.json', { 'Content-Type': 'application/json' }),
        ...response('/index.html', { 'Content-Type': 'text/html' }, 'page'),
        ...response('/runtime', {}, 'endpoint', false),
        ...response('/redirect', {}, 'endpoint', true, '/new/документ.json')
      ])
    );
    expect(config).toMatchInlineSnapshot(`
      "# Generated from prerendered endpoint responses. Do not edit.

      location = \"/new/документ.json\" {
          types {}
          default_type \"application/json\";
          charset off;
          include /etc/nginx/kps/security.conf;
          try_files $uri =404;
      }
      "
    `);
  });

  it('preserves catalog profile and declared Link without manual header duplicates', () => {
    expect(
      renderStaticResponseMetadata(
        response('/.well-known/api-catalog', {
          'Content-Type': 'application/linkset+json; profile="https://example.com/profile"',
          Link: '<https://example.com/.well-known/api-catalog>; rel="api-catalog"'
        })
      )
    ).toMatchInlineSnapshot(`
      "# Generated from prerendered endpoint responses. Do not edit.

      location = \"/.well-known/api-catalog\" {
          types {}
          default_type \"application/linkset+json; profile=\\\"https://example.com/profile\\\"\";
          charset off;
          include /etc/nginx/kps/security.conf;
          add_header Link \"<https://example.com/.well-known/api-catalog>; rel=\\\"api-catalog\\\"\" always;
          add_header Cache-Control \"public,max-age=3600,stale-while-revalidate=600\" always;
          try_files $uri =404;
      }
      "
    `);
  });

  it.each([
    ['/815/compare/data/settlements.json', 'application/json', '300,stale-while-revalidate=300'],
    ['/map/data/places.json', 'application/json', '300,stale-while-revalidate=300'],
    ['/status/data/status.json', 'application/json', '60,stale-while-revalidate=300'],
    ['/people/data/people.json', 'application/json', '3600,stale-while-revalidate=600'],
    [
      '/news/schemas/articles.schema.json',
      'application/schema+json',
      '3600,stale-while-revalidate=600'
    ],
    [
      '/815/regulation/openapi/estimate-details.openapi.json',
      'application/vnd.oai.openapi+json',
      '3600,stale-while-revalidate=600'
    ],
    ['/.well-known/agent-skills/index.json', 'application/json', '3600,stale-while-revalidate=600'],
    ['/llms.txt', 'text/plain', '3600,stale-while-revalidate=600'],
    ['/robots.txt', 'text/plain', '3600,stale-while-revalidate=600'],
    ['/news/feed.xml', 'application/xml', '300,stale-while-revalidate=300'],
    ['/events/events.json', 'application/json', '3600,stale-while-revalidate=600'],
    [
      '/events/schemas/events.schema.json',
      'application/schema+json',
      '3600,stale-while-revalidate=600'
    ],
    ['/events/calendar/event.ics', 'text/calendar', '3600,stale-while-revalidate=600'],
    ['/static/settlements-explorer/version.json', 'application/json', '2592000,immutable']
  ])('keeps media type and cache policy for %s', (pathname, mediaType, cache) => {
    const config = renderStaticResponseMetadata(
      response(pathname, {
        'Content-Type': `${mediaType}; charset=utf-8`
      })
    );
    expect(config).toContain(`default_type "${mediaType}";\n    charset "utf-8";`);
    expect(config).toContain(`add_header Cache-Control "public,max-age=${cache}" always;`);
  });

  it.each(['/manifest.json', '/sarafan/food/contact/contact.vcf', '/new/data.json'])(
    'does not assign an invented TTL to %s',
    (pathname) => {
      const config = renderStaticResponseMetadata(
        response(pathname, { 'Content-Type': 'application/json' })
      );
      expect(config).not.toContain('Cache-Control');
    }
  );

  it('keeps Markdown robots and augments its existing Vary with the most specific guide', () => {
    const config = renderStaticResponseMetadata(
      response('/815/regulation/services/index.md', {
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Robots-Tag': 'noindex, follow',
        Vary: 'Origin, origin, Accept-Encoding'
      })
    );
    expect(config).toMatchInlineSnapshot(`
      "# Generated from prerendered endpoint responses. Do not edit.

      location = \"/815/regulation/services/index.md\" {
          types {}
          default_type \"text/markdown\";
          charset \"utf-8\";
          charset_types *;
          include /etc/nginx/kps/security.conf;
          add_header Link \"</815/regulation/llms.txt>; rel=\\\"describedby\\\"; type=\\\"text/plain\\\"\" always;
          add_header X-Robots-Tag \"noindex, follow\" always;
          add_header Vary \"origin, Accept-Encoding, Accept\" always;
          add_header Cache-Control \"no-cache\" always;
          gzip_vary off;
          try_files $uri =404;
      }
      "
    `);
  });

  it('does not invent or overwrite application-owned links', () => {
    const link = '<https://example.com/details.schema.json>; rel="service-desc"';
    const config = renderStaticResponseMetadata(
      response('/new/index.md', {
        'Content-Type': 'text/markdown',
        Link: link
      })
    );
    expect(config).toContain('details.schema.json');
    expect(config).not.toContain('describedby');
  });

  it('escapes nginx literals without treating header dollars as variables', () => {
    const config = renderStaticResponseMetadata(
      response('/download/"$file\\.vcf', {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': 'attachment; filename="quote\\$file.vcf"'
      })
    );
    expect(config).toContain('location = "/download/\\"$file\\\\.vcf"');
    expect(config).toContain('filename=\\"quote\\\\${endpoint_literal_dollar}file.vcf\\"');
  });

  it('ignores transport fields but rejects unhandled application headers', () => {
    expect(
      renderStaticResponseMetadata(
        response('/data', {
          'Content-Type': 'application/json',
          'Content-Length': '100',
          'Content-Encoding': 'gzip'
        })
      )
    ).not.toContain('Content-Encoding');
    expect(() =>
      renderStaticResponseMetadata(
        response('/data', {
          'Content-Type': 'application/json',
          'X-App-Metadata': 'cannot silently disappear'
        })
      )
    ).toThrow('Invalid static response metadata for /data');
  });

  it('rejects missing content types, control characters and an empty endpoint selection', () => {
    expect(() => renderStaticResponseMetadata(response('/data', {}))).toThrow(
      'Invalid static response metadata for /data'
    );
    expect(() =>
      renderStaticResponseMetadata(response('/bad\npath', { 'Content-Type': 'application/json' }))
    ).toThrow('Invalid static response metadata');
    expect(() => renderStaticResponseMetadata(new Map())).toThrow(
      'Static endpoint response metadata is empty'
    );
  });

  it('sorts concrete locations independently of rendering order', () => {
    const a = response('/a', { 'Content-Type': 'application/json' });
    const b = response('/b', { 'Content-Type': 'application/json' });
    expect(renderStaticResponseMetadata(new Map([...a, ...b]))).toBe(
      renderStaticResponseMetadata(new Map([...b, ...a]))
    );
  });

  it.each([
    [undefined, false, undefined],
    [undefined, true, 'Accept'],
    ['Accept, accept, Origin', true, 'accept, Origin'],
    ['*, Accept', true, '*']
  ])('combines Vary %s without duplicate tokens', (input, markdown, expected) => {
    expect(mergeVary(input, markdown)).toBe(expected);
  });
});
