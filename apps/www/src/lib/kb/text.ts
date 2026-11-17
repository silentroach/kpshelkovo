import {
  createMarkdownDocument,
  parseMarkdownFragment,
  serializeMarkdownDocument,
  tablesToLists
} from '@shelkovo/markdown';

import { transformAdaptive } from '@/lib/markdown/adaptive';
import { extractFirstContentText } from '@/lib/markdown/content-emphasis';

export const extractFirstKbText = (markdown: string, source?: string): string | undefined => {
  if (!markdown.includes(':::adaptive')) return extractFirstContentText(markdown);
  const children = tablesToLists(
    transformAdaptive(parseMarkdownFragment(markdown), 'mobile', source)
  );
  return extractFirstContentText(serializeMarkdownDocument(createMarkdownDocument({ children })));
};
