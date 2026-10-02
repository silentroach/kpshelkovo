import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, it } from 'vitest';

import { renderStaticResponseMetadata } from '../static-response-metadata';

it.skipIf(!process.env.NGINX_BIN)(
  'nginx serves literal metadata for GET, HEAD and gzip',
  async () => {
    const directory = await mkdtemp(join(tmpdir(), 'endpoint-metadata-'));
    const socket = createServer();
    await new Promise<void>((resolve) => socket.listen(0, '127.0.0.1', resolve));
    const address = socket.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address');
    await new Promise<void>((resolve, reject) =>
      socket.close((error) => (error ? reject(error) : resolve()))
    );

    const documents = [
      [
        '/schemas/example.json',
        'application/schema+json; charset=utf-8',
        '<https://example.com/schema>; rel="service-desc"'
      ],
      [
        '/catalog',
        'application/linkset+json; profile="https://example.com/profile"',
        '<https://example.com/catalog>; rel="api-catalog"'
      ],
      [
        '/news/tags/тариф/index.md',
        'text/markdown; charset=utf-8',
        '<https://example.com/$guide>; rel="describedby"'
      ],
      ['/download/quote"\\$file.vcf', 'text/vcard; charset=utf-8', '']
    ] as const;
    const disposition = 'attachment; filename="quote\\$file.vcf"';
    const body = 'Literal representation\n'.repeat(100);
    const config = renderStaticResponseMetadata(
      new Map(
        documents.map(([pathname, contentType, link]) => {
          const headers = new Headers({ 'Content-Type': contentType });
          headers.set(link ? 'Link' : 'Content-Disposition', link || disposition);
          return [
            pathname,
            {
              headers,
              route: {
                type: 'endpoint' as const,
                isPrerendered: true,
                entrypoint: 'src/pages/document.ts'
              }
            }
          ];
        })
      )
    );
    const nginx = process.env.NGINX_BIN;
    if (!nginx) throw new Error('NGINX_BIN is required');
    const run = (...args: readonly string[]): void => {
      execFileSync(nginx, ['-e', 'stderr', '-p', `${directory}/`, '-c', 'nginx.conf', ...args], {
        stdio: 'inherit'
      });
    };
    let started = false;
    try {
      for (const [pathname] of documents) {
        const file = join(directory, 'site', pathname);
        await mkdir(join(file, '..'), { recursive: true });
        await writeFile(file, body);
      }
      await writeFile(
        join(directory, 'security.conf'),
        await readFile(new URL('../../../../../ops/nginx/security.conf', import.meta.url))
      );
      await writeFile(
        join(directory, 'metadata.conf'),
        config.replaceAll('/etc/nginx/kps/security.conf', `${directory}/security.conf`)
      );
      await writeFile(
        join(directory, 'nginx.conf'),
        `
      pid ${directory}/nginx.pid;
      error_log stderr;
      events {}
      http {
        access_log off;
        geo $endpoint_literal_dollar { default "$"; }
        gzip on;
        gzip_vary on;
        gzip_min_length 1;
        gzip_types text/markdown application/schema+json;
        server {
          listen 127.0.0.1:${address.port};
          root ${directory}/site;
          include ${directory}/metadata.conf;
        }
      }
    `
      );
      run('-t');
      run();
      started = true;
      for (const [pathname, contentType, link] of documents) {
        const url = `http://127.0.0.1:${address.port}${encodeURI(pathname)}`;
        const get = await fetch(url);
        const head = await fetch(url, { method: 'HEAD' });
        expect(get.headers.get('content-type')).toBe(contentType);
        expect(head.headers.get('content-type')).toBe(contentType);
        expect(get.headers.get('x-content-type-options')).toBe('nosniff');
        if (link) expect(get.headers.get('link')).toBe(link);
        else expect(get.headers.get('content-disposition')).toBe(disposition);
        expect(head.headers.get(link ? 'link' : 'content-disposition')).toBe(
          get.headers.get(link ? 'link' : 'content-disposition')
        );
        expect(await get.text()).toBe(body);
        expect(await head.text()).toBe('');
      }
      const gzip = await fetch(`http://127.0.0.1:${address.port}/schemas/example.json`, {
        headers: { 'Accept-Encoding': 'gzip' }
      });
      expect(gzip.headers.get('content-encoding')).toBe('gzip');
      expect(await gzip.text()).toBe(body);
    } finally {
      if (started) run('-s', 'stop');
      await rm(directory, { recursive: true, force: true });
    }
  }
);
