import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outputRoot = resolve(process.argv[2] ?? 'apps/www/dist/site');
const baselineBytes = 112_423;
const maximumBytes = Math.floor(baselineBytes * 0.75);
const routes = [
  '/',
  '/news/',
  '/status/',
  '/815/compare/',
  '/815/compare/rating/',
  '/815/regulation/',
];

const blockingCssBytes = (route) => {
  const html = readFileSync(join(outputRoot, route, 'index.html'), 'utf8');
  const stylesheets = [
    ...html.matchAll(
      /<link\b(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="([^"]+)")[^>]*>/gu,
    ),
  ].map(([, href]) => href);

  if (stylesheets.length === 0) {
    throw new Error(`No blocking stylesheets found for ${route}`);
  }

  return stylesheets.reduce(
    (total, href) => total + statSync(join(outputRoot, href)).size,
    0,
  );
};

const violations = routes.flatMap((route) => {
  const bytes = blockingCssBytes(route);

  console.log(`${route} ${bytes} / ${maximumBytes} bytes`);
  return bytes > maximumBytes ? [`${route}: ${bytes} bytes`] : [];
});

if (violations.length > 0) {
  throw new Error(
    `Blocking CSS exceeds the issue #399 budget:\n${violations.join('\n')}`,
  );
}
