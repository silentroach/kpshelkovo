export interface MarkdownResourceNode {
  readonly type: string;
  readonly children?: readonly MarkdownResourceNode[];
  url?: string;
}
