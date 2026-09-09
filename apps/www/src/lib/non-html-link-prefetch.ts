import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

import { Window } from 'happy-dom';

import type {
  AuditNonHtmlAnchorPrefetchInput,
  FindNonHtmlAnchorPrefetchViolationsInput,
  NonHtmlAnchorPrefetchViolation
} from './non-html-link-prefetch.types';

const defaultSameOrigins = ['https://kpshelkovo.online'] as const;
const sourceExtensions = new Set(['.astro', '.svelte', '.md', '.mdx']);
const nonHtmlExtensions = ['.pdf', '.ics', '.vcf', '.json', '.xml', '.md'] as const;
const nonHtmlPathMarkers = ['/data/', '/.well-known/', '/openapi/', '/schemas/'] as const;
const schemePattern = /^[a-z][a-z\d+.-]*:/iu;
const httpUrlPattern = /^https?:\/\//iu;

const isSourceFile = (path: string): boolean => sourceExtensions.has(extname(path));

const listSourceFiles = (dir: string): readonly string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(path);
    }

    return entry.isFile() && isSourceFile(path) ? [path] : [];
  });

const stripQueryAndHash = (href: string): string => {
  const [path = ''] = href.split(/[?#]/u);

  return path;
};

const getInternalPath = (href: string, sameOrigins: ReadonlySet<string>): string | undefined => {
  if (href === '' || href.startsWith('#') || href.startsWith('//')) {
    return undefined;
  }

  if (httpUrlPattern.test(href)) {
    const url = new URL(href);

    return sameOrigins.has(url.origin) ? url.pathname : undefined;
  }

  if (schemePattern.test(href)) {
    return undefined;
  }

  return stripQueryAndHash(href);
};

const isNonHtmlPath = (path: string): boolean => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const lowerPath = normalizedPath.toLowerCase();

  return (
    nonHtmlExtensions.some((extension) => lowerPath.endsWith(extension)) ||
    nonHtmlPathMarkers.some((marker) => lowerPath.includes(marker))
  );
};

const getLocation = (
  code: string,
  index: number
): Pick<NonHtmlAnchorPrefetchViolation, 'column' | 'line'> => {
  const lines = code.slice(0, index).split('\n');
  const column = (lines.at(-1)?.length ?? 0) + 1;

  return {
    column,
    line: lines.length
  };
};

const findAnchorIndex = (code: string, href: string, fromIndex: number): number => {
  const hrefIndex = [`href="${href}"`, `href='${href}'`]
    .map((token) => code.indexOf(token, fromIndex))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (hrefIndex === undefined) {
    return fromIndex;
  }

  const tagIndex = code.lastIndexOf('<a', hrefIndex);

  return tagIndex >= 0 ? tagIndex : hrefIndex;
};

export const findNonHtmlAnchorPrefetchViolations = ({
  code,
  filePath,
  sameOrigins = defaultSameOrigins
}: FindNonHtmlAnchorPrefetchViolationsInput): readonly NonHtmlAnchorPrefetchViolation[] => {
  const origins = new Set(sameOrigins);
  const window = new Window();

  try {
    window.document.body.innerHTML = code;
    let cursor = 0;

    return Array.from(window.document.querySelectorAll('a[href]')).flatMap((anchor) => {
      const href = anchor.getAttribute('href') ?? undefined;
      const internalPath =
        href === undefined || href.startsWith('{') ? undefined : getInternalPath(href, origins);

      if (
        href === undefined ||
        internalPath === undefined ||
        !isNonHtmlPath(internalPath) ||
        anchor.getAttribute('data-astro-prefetch') === 'false'
      ) {
        return [];
      }

      const anchorIndex = findAnchorIndex(code, href, cursor);
      cursor = anchorIndex + 2;

      return [
        {
          ...getLocation(code, anchorIndex),
          filePath,
          href
        }
      ];
    });
  } finally {
    window.close();
  }
};
export const auditNonHtmlAnchorPrefetch = ({
  rootDir,
  sameOrigins = defaultSameOrigins
}: AuditNonHtmlAnchorPrefetchInput): readonly NonHtmlAnchorPrefetchViolation[] =>
  listSourceFiles(rootDir).flatMap((path) =>
    findNonHtmlAnchorPrefetchViolations({
      code: readFileSync(path, 'utf-8'),
      filePath: relative(process.cwd(), path),
      sameOrigins
    })
  );

export const formatNonHtmlAnchorPrefetchViolation = ({
  column,
  filePath,
  href,
  line
}: NonHtmlAnchorPrefetchViolation): string =>
  `${filePath}:${line}:${column} links to ${href} without data-astro-prefetch="false". Preferred fix: use ResourceLink, or add the attribute explicitly.`;
