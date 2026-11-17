import type {
  MarkdownTableDocument,
  MarkdownTableContainer,
  MarkdownTableWrapper
} from './tables-html.types';

const wrapTables = (container: MarkdownTableContainer): void => {
  container.children.forEach((node, index) => {
    if (node.type === 'table') {
      container.children[index] = {
        type: 'blockquote',
        data: {
          hName: 'div',
          hProperties: {
            className: ['ui-markdown-table-scroll'],
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
