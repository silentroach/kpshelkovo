import type { BlockContent, Root, RootContent, Table } from 'mdast';
import { visit } from 'unist-util-visit';

import { md } from './generate';

const tableList = (table: Table): BlockContent => {
  const [header, ...rows] = table.children;
  if (!rows.length) {
    return md.list([
      md.listItem((header?.children ?? []).map((cell) => md.paragraph(cell.children)))
    ]);
  }
  return md.list(
    rows.map((row) =>
      md.listItem(
        (header?.children ?? []).map((heading, index) =>
          md.paragraph([
            ...heading.children,
            md.text(row.children[index]?.children.length ? ': ' : ':'),
            ...(row.children[index]?.children ?? [])
          ])
        )
      )
    )
  );
};

/** Keep table cells and column labels together without emitting Markdown tables. */
export const tablesToLists = (children: readonly RootContent[]): RootContent[] => {
  const tree: Root = { type: 'root', children: structuredClone([...children]) };
  visit(tree, 'table', (table, index, parent) => {
    if (parent && index !== undefined) {
      parent.children.splice(index, 1, tableList(table));
    }
  });
  return tree.children;
};
