import { writeFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MIMEType } from 'node:util';

import type { AstroIntegration, IntegrationResolvedRoute } from 'astro';

import { llmsPathForPage, publicSurfaceRegistry } from '@/lib/public-surface';

import { nginxLiteralSchema, responseMetadataSchema } from './static-response-metadata.schema';
import type { StaticEndpointRoute, StaticResponseHeaders } from './static-response-metadata.types';

// These fields describe transport, not metadata of the saved representation.
const transportHeaders = new Set([
  'date',
  'content-length',
  'content-encoding',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);

const quote = (value: string): string =>
  `"${nginxLiteralSchema.parse(value).replace(/\\/gu, '\\\\').replace(/"/gu, '\\"')}"`;

// add_header compiles variables even inside quoted strings. geo supplies a literal dollar.
const quoteHeader = (value: string): string =>
  quote(value).replace(/\$/gu, '${endpoint_literal_dollar}');

const isStaticEndpoint = (route: StaticEndpointRoute): boolean =>
  route.type === 'endpoint' && route.isPrerendered && !route.redirect;

const cacheControl = (pathname: string, mediaType: string): string | undefined => {
  if (pathname.startsWith('/static/')) return 'public,max-age=2592000,immutable';
  if (mediaType === 'text/markdown') return 'no-cache';
  if (
    /^\/(?:815\/compare|map)\/data\//u.test(pathname) ||
    /^\/(?:news|status)\/feed\.xml$/u.test(pathname)
  ) {
    return 'public,max-age=300,stale-while-revalidate=300';
  }
  if (pathname.startsWith('/status/data/')) return 'public,max-age=60,stale-while-revalidate=300';
  if (
    /^(?:\/(?:.*\/)?\.well-known\/(?:api-catalog|agent-skills\/index\.json)|\/(?:.*\/)?llms\.txt|\/robots\.txt)$/u.test(
      pathname
    ) ||
    /^\/(?:news|status|people|815\/(?:compare|regulation))\/(?:data|\.well-known|llms|openapi|schemas)\//u.test(
      pathname
    ) ||
    pathname === '/events/events.json' ||
    pathname.startsWith('/events/schemas/') ||
    mediaType === 'text/calendar'
  )
    return 'public,max-age=3600,stale-while-revalidate=600';
  return;
};

export const mergeVary = (value?: string, markdown = false): string | undefined => {
  const tokens = (value ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.includes('*')) return '*';
  const unique = new Map(tokens.map((token) => [token.toLowerCase(), token]));
  if (markdown && !unique.has('accept')) unique.set('accept', 'Accept');
  return [...unique.values()].join(', ') || undefined;
};

export const renderStaticResponseMetadata = (responses: StaticResponseHeaders): string => {
  const endpoints = [...responses].filter(([, { route }]) => isStaticEndpoint(route));
  if (endpoints.length === 0) throw new Error('Static endpoint response metadata is empty');

  return (
    '# Generated from prerendered endpoint responses. Do not edit.\n\n' +
    endpoints
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([pathname, { headers }]) => {
        try {
          const metadata = responseMetadataSchema.parse(
            Object.fromEntries([...headers].filter(([name]) => !transportHeaders.has(name)))
          );
          const mime = new MIMEType(metadata['content-type']);
          const charset = mime.params.get('charset');
          mime.params.delete('charset');
          const markdown = mime.essence === 'text/markdown';
          const vary = mergeVary(metadata.vary, markdown);
          const link =
            metadata.link ??
            (markdown
              ? `<${llmsPathForPage(pathname)}>; rel="describedby"; type="text/plain"`
              : undefined);
          const ttl = cacheControl(pathname, mime.essence);
          const lines = [
            `location = ${quote(pathname)} {`,
            '    types {}',
            `    default_type ${quote(charset ? mime.toString() : metadata['content-type'])};`,
            `    charset ${charset ? quote(charset) : 'off'};`
          ];
          if (charset) lines.push('    charset_types *;');
          lines.push('    include /etc/nginx/kps/security.conf;');
          for (const [name, value] of [
            ['Link', link],
            ['Content-Disposition', metadata['content-disposition']],
            [
              'X-Robots-Tag',
              metadata['x-robots-tag'] ?? (markdown ? 'noindex, follow' : undefined)
            ],
            ['Vary', vary],
            ['Cache-Control', ttl]
          ]) {
            if (value) lines.push(`    add_header ${name} ${quoteHeader(value)} always;`);
          }
          if (vary === '*' || vary?.toLowerCase().split(', ').includes('accept-encoding')) {
            lines.push('    gzip_vary off;');
          }
          if (/^\/(?:static\/|(?:815\/compare|map)\/data\/)/u.test(pathname)) {
            lines.push('    access_log off;', '    log_not_found off;');
          }
          lines.push('    try_files $uri =404;', '}', '');
          return lines.join('\n');
        } catch (error) {
          throw new Error(`Invalid static response metadata for ${pathname}`, { cause: error });
        }
      })
      .join('\n')
  );
};

export const staticResponseMetadata = (): AstroIntegration => {
  let routes: readonly IntegrationResolvedRoute[] = [];
  let emittedPaths: ReadonlySet<string> = new Set();
  return {
    name: 'static-response-metadata',
    hooks: {
      'astro:config:done': ({ setAdapter }) => {
        setAdapter({
          name: 'static-response-metadata',
          entrypointResolution: 'auto',
          adapterFeatures: { buildOutput: 'static', staticHeaders: true },
          supportedAstroFeatures: { staticOutput: 'stable', sharpImageService: 'stable' }
        });
      },
      'astro:routes:resolved': ({ routes: resolved }) => {
        routes = resolved;
      },
      'astro:build:generated': async ({ dir, routeToHeaders, logger }) => {
        const config = renderStaticResponseMetadata(routeToHeaders);
        emittedPaths = new Set(
          [...routeToHeaders].flatMap(([path, { route }]) =>
            isStaticEndpoint(route) ? [path] : []
          )
        );
        await writeFile(new URL('../api-response-metadata.conf', dir), config, 'utf8');
        logger.info(`Generated response metadata for ${emittedPaths.size} static endpoints`);
      },
      'astro:build:done': ({ dir, assets }) => {
        const expectedPaths = new Set(
          routes
            .filter(isStaticEndpoint)
            .flatMap((route) =>
              (assets.get(route.pattern) ?? []).map(
                (file) => `/${relative(fileURLToPath(dir), fileURLToPath(file))}`
              )
            )
        );
        for (const surface of publicSurfaceRegistry.surfaces) {
          if (
            surface.path &&
            [
              'application/json',
              'application/schema+json',
              'application/vnd.oai.openapi+json'
            ].includes(surface.mediaType)
          ) {
            expectedPaths.add(surface.path);
          }
        }
        const missing = [...expectedPaths].filter((path) => !emittedPaths.has(path));
        if (missing.length)
          throw new Error(`Missing static endpoint metadata: ${missing.sort().join(', ')}`);
      }
    }
  };
};
