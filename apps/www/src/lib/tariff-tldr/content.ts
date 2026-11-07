import {
  createMarkdownDocument,
  parseMarkdownFragment,
  serializeMarkdownDocument
} from '@shelkovo/markdown';

import tariffTldrSource from '@/data/tariff-tldr.md?raw';

const nodes = parseMarkdownFragment(tariffTldrSource);
const titleNode = nodes[0];
if (
  titleNode?.type !== 'heading' ||
  titleNode.depth !== 1 ||
  titleNode.children.length !== 1 ||
  titleNode.children[0]?.type !== 'text'
) {
  throw new Error('tariff-tldr.md must start with a plain-text H1 heading');
}

export const TARIFF_TLDR = {
  title: titleNode.children[0].value,
  markdown: serializeMarkdownDocument(createMarkdownDocument({ children: nodes })),
  bodyMarkdown: serializeMarkdownDocument(createMarkdownDocument({ children: nodes.slice(1) }))
} as const;

export const TARIFF_TLDR_DESCRIPTION =
  'Цитата собственника о новом тарифе в Шелково из сообщения в чате от 11 августа 2026 года. Полный текст со ссылкой на источник.';
