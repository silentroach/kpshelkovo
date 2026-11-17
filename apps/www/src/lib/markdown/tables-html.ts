import type {
  MarkdownTableDocument,
  MarkdownTableContainer,
  MarkdownTableWrapper
} from './tables-html.types';

const wrapTables = (container: MarkdownTableContainer): void => {
  container.children.forEach((node, index) => {
    if (node.type === 'table') {
      node.data = { hProperties: { className: ['ui-sticky-table'] } };
      const header = node.children[0];
      if (header) {
        header.data = { hProperties: { className: ['ui-sticky-table-head'] } };
      }
      container.children[index] = {
        type: 'blockquote',
        data: {
          hName: 'div',
          hProperties: {
            className: [
              'ui-markdown-table-scroll',
              'ui-sticky-table-shell',
              'ui-sticky-table-surface'
            ],
            'data-ui-sticky-table-shell': '',
            tabIndex: 0,
            role: 'region',
            ariaLabel: 'Таблица'
          }
        },
        children: [node]
      } satisfies MarkdownTableWrapper;
    } else if (node.type === 'blockquote' || node.type === 'footnoteDefinition') {
      wrapTables(node);
    } else if (node.type === 'list') {
      for (const item of node.children) {
        wrapTables(item);
      }
    }
  });
};

export const wrapMarkdownTables = (document: MarkdownTableDocument): void => {
  wrapTables(document);
};
