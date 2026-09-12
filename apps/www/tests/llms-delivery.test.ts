import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { llmsDocumentSchema } from '@/lib/markdown/tests/llms-contract';
import { llmsPathForPage, publicSurfaceRegistry } from '@/lib/public-surface';

const directory = resolve('../../dist/www');
const origin = 'https://kpshelkovo.online';
const base = process.env.LLMS_CHECK_ORIGIN;
const guides = publicSurfaceRegistry.surfaces.filter((surface) =>
  surface.discoveryRoles.includes('llms')
);
const files = (await readdir(directory, { recursive: true })).sort();
const htmlPaths = files
  .filter((file) => file.endsWith('index.html'))
  .map((file) => `/${file.replace(/index\.html$/u, '')}`);
const fileFor = (pathname: string): string =>
  resolve(directory, `.${decodeURI(pathname)}${pathname.endsWith('/') ? 'index.html' : ''}`);
const read = (pathname: string): Promise<string> => readFile(fileFor(pathname), 'utf8');
const guidePaths = z
  .array(z.string())
  .length(6)
  .parse(guides.map((surface) => surface.path));
const navigation = (html: string) =>
  [...html.matchAll(/<link\b[^>]*>/gu)]
    .map(([tag]) =>
      Object.fromEntries(
        [...tag.matchAll(/([a-z]+)="([^"]*)"/gu)].map(([, name, value]) => [name, value])
      )
    )
    .filter(
      (link) =>
        link.rel === 'describedby' || (link.rel === 'alternate' && link.type === 'text/markdown')
    );
const describedbyLinks = (path: string) =>
  z
    .array(
      z.object({
        rel: z.literal('describedby'),
        type: z.literal('text/plain'),
        href: z.literal(`${origin}${llmsPathForPage(path)}`)
      })
    )
    .length(1);
const publicText = z.string().refine((text) => !/llms-full\.txt|apps\/www|repo:/u.test(text));
const lighthouseContent = z
  .string()
  .min(50)
  .regex(/^\s*#\s+.+/mu)
  .regex(/\[.+\]\(.+\)/u);

describe('built llms and discovery', () => {
  it.each(guidePaths)(
    '%s passes v2, Lighthouse content checks and points to built resources',
    async (path) => {
      const document = lighthouseContent.parse(await read(path));
      const links = llmsDocumentSchema.parse(document);
      for (const link of links) {
        expect((await stat(fileFor(new URL(link).pathname))).isFile(), link).toBe(true);
      }
    }
  );

  it('does not publish full files or advertise them in Markdown and catalogs', async () => {
    expect(files.filter((file) => /llms-full\.txt(?:\.|$)/u.test(file))).toEqual([]);
    for (const file of files.filter(
      (file) => file.endsWith('.md') || file.endsWith('/api-catalog')
    )) {
      expect(
        publicText.safeParse(await readFile(resolve(directory, file), 'utf8')).error,
        file
      ).toBeUndefined();
    }
  });

  it('every built HTML page links its real Markdown companion and most specific guide', async () => {
    for (const path of htmlPaths) {
      const links = navigation(await read(path));
      expect(
        describedbyLinks(path).safeParse(links.filter((link) => link.rel === 'describedby')).error,
        path
      ).toBeUndefined();
      const [markdown] = z
        .array(z.object({ href: z.url(), type: z.literal('text/markdown') }))
        .length(1)
        .parse(links.filter((link) => link.rel === 'alternate'));
      expect((await stat(fileFor(new URL(markdown!.href).pathname))).isFile(), path).toBe(true);
    }
  });
});

// Exercise each HTML route family, including detail routes and root-guide fallbacks.
const samples = [
  '/',
  '/news/',
  '/news/archive/',
  '/news/tags/',
  '/status/',
  '/status/history/',
  '/815/compare/',
  '/815/compare/rating/',
  '/815/regulation/',
  '/815/regulation/assets/',
  '/815/regulation/services/',
  '/kb/',
  '/map/',
  '/reviews/',
  '/reviews/rules/',
  '/sarafan/',
  ...[
    /^\/news\/\d{4}\/$/u,
    /^\/news\/\d{4}\/\d{2}\/$/u,
    /^\/news\/\d{4}\/\d{2}\/[^/]+\/$/u,
    /^\/news\/tags\/[^/]+\/$/u,
    /^\/status\/incidents\//u,
    /^\/status\/calendar\/\d{4}\/$/u,
    /^\/status\/calendar\/\d{4}\/\d{2}\/$/u,
    /^\/status\/electricity\/$/u,
    /^\/people\//u,
    /^\/meetings\//u,
    /^\/815\/compare\/settlements\//u,
    /^\/kb\/.+\/$/u,
    /^\/map\/.+\/$/u,
    /^\/reviews\/\d/u,
    /^\/sarafan\/[^/]+\/$/u,
    /^\/sarafan\/[^/]+\/[^/]+\/$/u
  ].map((pattern) => z.string().parse(htmlPaths.find((path) => pattern.test(path))))
];

const fetchPublic = (path: string, accept = 'text/html') =>
  fetch(new URL(path, base), {
    headers: { Accept: accept },
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000)
  });

const expectGuideHeader = (response: Response, path: string): void => {
  const header = z.string().parse(response.headers.get('link'));
  const links = [...header.matchAll(/<([^>]+)>; rel="describedby"; type="text\/plain"/gu)].map(
    ([, href]) => new URL(href!, origin).pathname
  );
  z.array(z.literal(llmsPathForPage(path)))
    .length(1)
    .parse(links);
  expect(header).not.toContain('llms-full');
};

describe.skipIf(!base)('HTTP delivery', () => {
  it.each(guidePaths)(
    '%s is served and its old full URL returns 404 without a redirect',
    async (path) => {
      const response = await fetchPublic(path, 'text/plain');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/plain');
      llmsDocumentSchema.parse(await response.text());
      const removed = await fetchPublic(path.replace('llms.txt', 'llms-full.txt'));
      expect(removed.status).toBe(404);
      expect(removed.headers.has('location')).toBe(false);
    }
  );

  it.each(samples)(
    '%s agrees across HTML, direct Markdown and Accept negotiation',
    async (path) => {
      const response = await fetchPublic(path);
      expect(response.status).toBe(200);
      expectGuideHeader(response, path);
      const links = navigation(await response.text());
      describedbyLinks(path).parse(links.filter((link) => link.rel === 'describedby'));
      const [markdown] = z
        .array(z.object({ href: z.url() }))
        .length(1)
        .parse(links.filter((link) => link.rel === 'alternate'));
      const markdownPath = new URL(markdown!.href).pathname;
      expect(response.headers.get('link')).toContain(
        `<${markdownPath}>; rel="alternate"; type="text/markdown"`
      );
      const direct = await fetchPublic(markdownPath, 'text/markdown');
      const negotiated = await fetchPublic(`${path}?llms-check=1`, 'text/markdown');
      for (const result of [direct, negotiated]) {
        expect(result.status).toBe(200);
        expect(result.headers.get('content-type')).toContain('text/markdown');
        expect(result.headers.get('vary')).toContain('Accept');
        expectGuideHeader(result, path);
      }
      expect(await negotiated.text()).toBe(await direct.text());
    }
  );

  it.each([
    '/people/index.md',
    '/meetings/index.md',
    '/815/regulation/full.md',
    '/815/regulation/full/services.md',
    '/.well-known/agent-skills/status-feed/SKILL.md',
    '/815/compare/.well-known/agent-skills/explorer-data/SKILL.md'
  ])('discovers a guide from the direct Markdown resource %s', async (path) => {
    const response = await fetchPublic(path, 'text/markdown');
    expect(response.status).toBe(200);
    expectGuideHeader(response, path);
  });
});
