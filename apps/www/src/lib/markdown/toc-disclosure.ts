import type { TocContainer, TocNode } from './toc-disclosure.types';

/** Wrap the generated TOC, leaving its links and document headings untouched. */
export const transformTocDisclosure = (nodes: readonly TocNode[]): void => {
  for (const node of nodes) {
    if (node.type !== 'blockquote' || node.data?.hName !== 'nav') continue;
    const classes = node.data.hProperties?.className;
    if (!Array.isArray(classes) || !classes.includes('ui-markdown-toc')) continue;

    node.data.hProperties = {
      ...node.data.hProperties,
      className: [...classes, 'ui-markdown-toc--disclosure']
    };
    const details: TocContainer = {
      type: 'blockquote',
      data: { hName: 'details', hProperties: { className: ['ui-markdown-toc__disclosure'] } },
      children: [
        {
          type: 'paragraph',
          data: { hName: 'summary', hProperties: { className: ['ui-markdown-toc__summary'] } },
          children: [
            {
              type: 'text',
              value: 'Содержание',
              data: {
                hName: 'span',
                hProperties: { className: ['ui-markdown-toc__summary-title'] }
              }
            },
            {
              type: 'text',
              value: 'Показать',
              data: { hName: 'span', hProperties: { className: ['ui-markdown-toc__show'] } }
            },
            {
              type: 'text',
              value: 'Скрыть',
              data: { hName: 'span', hProperties: { className: ['ui-markdown-toc__hide'] } }
            }
          ]
        },
        {
          type: 'blockquote',
          data: { hName: 'div', hProperties: { className: ['ui-markdown-toc__clip'] } },
          children: node.children
        }
      ]
    };
    node.children = [details];
  }
};
