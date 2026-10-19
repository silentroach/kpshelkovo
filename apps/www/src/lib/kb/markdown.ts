import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument
} from '@shelkovo/markdown';

import { transformContentEmphasis } from '@/lib/markdown/content-emphasis';
import { appendEditorialMapCaptions } from '@/lib/markdown/editorial-maps-companion';
import type { EditorialMapSelectionResolver } from '@/lib/markdown/editorial-maps.types';
import { absoluteUrl } from '@/lib/site';

import { kbDetailMarkdownUrl, kbMarkdownUrl } from './routes';
import type { KbPage, KbPageFlag } from './types';

interface MarkdownNode {
  readonly type: string;
  readonly children?: readonly MarkdownNode[];
  url?: string;
}

const KB_HTML_LINK_PATH = /^\/kb(?:\/[a-z0-9][a-z0-9/-]*)?\/?(?=[?#]|$)/u;

const kbMarkdownHref = (path: string): string => {
  const routeSlug = path.slice('/kb'.length).replace(/^\/+|\/+$/gu, '');

  return absoluteUrl(routeSlug ? kbDetailMarkdownUrl(routeSlug) : kbMarkdownUrl());
};

const rewriteKbLinkUrl = (url: string): string => {
  const path = KB_HTML_LINK_PATH.exec(url)?.[0];

  return path ? `${kbMarkdownHref(path)}${url.slice(path.length)}` : url;
};

const rewriteKbLinkNode = (node: MarkdownNode): void => {
  if (node.type === 'link' && node.url) {
    node.url = rewriteKbLinkUrl(node.url);
  }

  for (const child of node.children ?? []) {
    rewriteKbLinkNode(child);
  }
};

const kbMarkdownBody = (
  markdown: string,
  source: string,
  editorialMapResolver?: EditorialMapSelectionResolver
) => {
  const nodes = appendEditorialMapCaptions(
    transformContentEmphasis(parseMarkdownFragment(markdown), 'markdown'),
    source,
    editorialMapResolver
  );

  for (const node of nodes) {
    rewriteKbLinkNode(node);
  }

  return nodes;
};

const kbFrontmatter = (page: KbPage): { readonly title: string; flags?: readonly KbPageFlag[] } => {
  const frontmatter: { title: string; flags?: readonly KbPageFlag[] } = {
    title: page.title
  };

  if (page.flags.length > 0) {
    frontmatter.flags = page.flags;
  }

  return frontmatter;
};

export const buildKbPageMarkdown = (
  page: KbPage,
  editorialMapResolver?: EditorialMapSelectionResolver
): string =>
  serializeMarkdownDocument(
    createMarkdownDocument({
      frontmatter: kbFrontmatter(page),
      children: [
        md.heading(1, page.title),
        ...kbMarkdownBody(page.body.trim(), page.canonical, editorialMapResolver)
      ]
    })
  );
