import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument,
} from '@shelkovo/markdown';

import { absoluteUrl } from '@/lib/site';

import { kbDetailMarkdownUrl, kbMarkdownUrl } from './routes';
import type { KbPage, KbPageFlag } from './types';

const KB_HTML_LINK_DESTINATION =
  /(\]\()(\/kb(?:\/[a-z0-9][a-z0-9/-]*)?\/?)(\))/gu;

const kbMarkdownHref = (path: string): string => {
  const routeSlug = path.slice('/kb'.length).replace(/^\/+|\/+$/gu, '');

  return absoluteUrl(
    routeSlug ? kbDetailMarkdownUrl(routeSlug) : kbMarkdownUrl(),
  );
};

const rewriteKbLinksToMarkdown = (markdown: string): string =>
  markdown.replace(
    KB_HTML_LINK_DESTINATION,
    (_match, prefix: string, path: string, suffix: string) =>
      `${prefix}${kbMarkdownHref(path)}${suffix}`,
  );

const kbFrontmatter = (
  page: KbPage,
): { readonly title: string; flags?: readonly KbPageFlag[] } => {
  const frontmatter: { title: string; flags?: readonly KbPageFlag[] } = {
    title: page.title,
  };

  if (page.flags.length > 0) {
    frontmatter.flags = page.flags;
  }

  return frontmatter;
};

export const buildKbPageMarkdown = (page: KbPage): string =>
  serializeMarkdownDocument(
    createMarkdownDocument({
      frontmatter: kbFrontmatter(page),
      children: [
        md.heading(1, page.title),
        ...parseMarkdownFragment(rewriteKbLinksToMarkdown(page.body.trim())),
      ],
    }),
  );
