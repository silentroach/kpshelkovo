export type HtmlTreeNode = {
  readonly type: string;
  readonly tagName?: string;
  readonly value?: string;
  properties?: Record<string, unknown>;
  children?: HtmlTreeNode[];
};
