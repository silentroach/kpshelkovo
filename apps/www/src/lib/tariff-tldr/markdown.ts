import {
  createMarkdownDocument,
  parseMarkdownFragment,
  serializeMarkdownDocument
} from '@shelkovo/markdown';

import { transformContentEmphasis } from '@/lib/markdown/content-emphasis';
import { preprocessSiteMarkdownContent } from '@/lib/markdown/render';
import type { SiteMentionRegistry } from '@/lib/mentions';

import { TARIFF_TLDR } from './content';
import { tariffTldrCanonical, tariffTldrPath } from './routes';
import type { MarkdownResourceNode } from './types';

const resolvePublicResources = (node: MarkdownResourceNode): void => {
  if (node.url) {
    node.url = new URL(node.url, tariffTldrCanonical()).toString();
  }

  for (const child of node.children ?? []) {
    resolvePublicResources(child);
  }
};

export const buildTariffTldrMarkdown = (registry: SiteMentionRegistry): string => {
  const prepared = preprocessSiteMarkdownContent(TARIFF_TLDR.markdown, tariffTldrPath(), registry);
  const children = transformContentEmphasis(parseMarkdownFragment(prepared.markdown), 'markdown');

  for (const node of children) {
    resolvePublicResources(node);
  }

  return serializeMarkdownDocument(createMarkdownDocument({ children }));
};
