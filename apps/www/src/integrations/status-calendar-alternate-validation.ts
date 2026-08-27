import { access, glob, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

const calendarHtmlPattern = 'status/calendar/**/*.html';
const linkPattern = /<link\b[^>]*>/giu;
const attributePattern = /\b([a-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/giu;

const linkAttributes = (link: string): ReadonlyMap<string, string> =>
  new Map(
    [...link.matchAll(attributePattern)].map((match) => [
      match[1]?.toLowerCase() ?? '',
      match[2] ?? match[3] ?? '',
    ]),
  );

const markdownAlternatePaths = (html: string, site: URL): readonly string[] =>
  [...html.matchAll(linkPattern)].flatMap(([link]) => {
    const attributes = linkAttributes(link);
    const rel = attributes.get('rel')?.split(/\s+/u) ?? [];
    const href = attributes.get('href');

    if (
      !rel.includes('alternate') ||
      attributes.get('type') !== 'text/markdown' ||
      !href
    ) {
      return [];
    }

    const alternate = new URL(href, site);

    return alternate.origin === site.origin ? [alternate.pathname] : [];
  });

export const validateStatusCalendarAlternates = async (
  dir: URL,
  site: URL,
): Promise<void> => {
  const outputDirectory = fileURLToPath(dir);
  const missing: string[] = [];

  for await (const htmlPath of glob(calendarHtmlPattern, {
    cwd: outputDirectory,
  })) {
    const html = await readFile(resolve(outputDirectory, htmlPath), 'utf8');

    for (const alternatePath of markdownAlternatePaths(html, site)) {
      try {
        await access(resolve(outputDirectory, `.${alternatePath}`));
      } catch {
        missing.push(`${htmlPath} -> ${alternatePath}`);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing status calendar Markdown alternates:\n${missing
        .sort()
        .map((item) => `- ${item}`)
        .join('\n')}`,
    );
  }
};

export const statusCalendarAlternateValidation = (
  site: URL,
): AstroIntegration => ({
  name: 'status-calendar-alternate-validation',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await validateStatusCalendarAlternates(dir, site);
    },
  },
});
