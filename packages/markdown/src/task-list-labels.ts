import type { Plugin } from 'unified';

type HastNode = {
  readonly type: string;
  readonly tagName?: string;
  readonly value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const TASK_LIST_ITEM_CLASS = 'task-list-item';
const TASK_LABEL_ID_PREFIX = 'task-label';

const isTaskListItemCheckbox = (node: HastNode): boolean =>
  node.type === 'element' &&
  node.tagName === 'input' &&
  (node.properties?.type as string | undefined) === 'checkbox';

const isList = (node: HastNode): boolean =>
  node.type === 'element' && (node.tagName === 'ul' || node.tagName === 'ol');

const nodeText = (node: HastNode): string => {
  if (typeof node.value === 'string') {
    return node.value;
  }

  return node.children?.map(nodeText).join('') ?? '';
};

type SplitNodes = {
  readonly before: HastNode[];
  readonly label: HastNode[];
};

const splitLeadingWhitespace = (nodes: HastNode[]): SplitNodes => {
  if (nodes.length === 0) {
    return { before: [], label: [] };
  }

  const [first, ...rest] = nodes;

  if (first?.type !== 'text' || typeof first.value !== 'string') {
    return { before: [], label: nodes };
  }

  const leadingMatch = /^\s+/.exec(first.value);

  if (!leadingMatch) {
    return { before: [], label: nodes };
  }

  const leading = leadingMatch[0];
  const remaining = first.value.slice(leading.length);
  const before: HastNode[] = [{ type: 'text', value: leading }];
  const label: HastNode[] = remaining
    ? [{ type: 'text', value: remaining }, ...rest]
    : rest;

  return { before, label };
};

const hashText = (value: string): string => {
  let hash = 0;

  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    hash = (hash << 5) - hash + code;
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
};

const createLabelId = (text: string, usedIds: Set<string>): string => {
  const baseId = `${TASK_LABEL_ID_PREFIX}-${hashText(text)}`;
  let id = baseId;
  let suffix = 1;

  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(id);

  return id;
};

const labelTaskListItems = (node: HastNode, usedIds: Set<string>): void => {
  if (
    node.type !== 'element' ||
    node.tagName !== 'li' ||
    !Array.isArray(node.properties?.className) ||
    !(node.properties.className as readonly string[]).includes(
      TASK_LIST_ITEM_CLASS,
    )
  ) {
    node.children?.forEach((child) => labelTaskListItems(child, usedIds));

    return;
  }

  const children = node.children ?? [];
  const checkboxIndex = children.findIndex(isTaskListItemCheckbox);

  if (checkboxIndex === -1) {
    children.forEach((child) => labelTaskListItems(child, usedIds));

    return;
  }

  const checkbox = children[checkboxIndex];
  const followingNodes = children.slice(checkboxIndex + 1);
  const nestedListIndex = followingNodes.findIndex(isList);
  const labelEnd =
    nestedListIndex === -1 ? followingNodes.length : nestedListIndex;
  const labelNodes = followingNodes.slice(0, labelEnd);
  const remainingNodes = followingNodes.slice(labelEnd);
  const { before, label } = splitLeadingWhitespace(labelNodes);

  if (label.length === 0) {
    children.forEach((child) => labelTaskListItems(child, usedIds));

    return;
  }

  const labelText = label.map(nodeText).join('').trim();
  const labelId = createLabelId(labelText, usedIds);

  checkbox.properties = checkbox.properties ?? {};
  checkbox.properties.ariaLabelledBy = labelId;

  const labelSpan: HastNode = {
    type: 'element',
    tagName: 'span',
    properties: { id: labelId },
    children: label,
  };

  node.children = [
    ...children.slice(0, checkboxIndex + 1),
    ...before,
    labelSpan,
    ...remainingNodes,
  ];

  node.children.forEach((child) => labelTaskListItems(child, usedIds));
};

export const rehypeTaskListItemLabels: Plugin<[], HastNode> = () => (tree) => {
  labelTaskListItems(tree, new Set());
};
