import type { Root } from 'mdast';

export type MarkdownPreprocessor = (markdown: string) => string;

/** Runs after the author's TOC is built, while code nodes still carry lang and meta. */
export type MarkdownAstTransform = (
  document: Root,
  /** Reserve an ID for an inserted element, including a generated heading. */
  reserveId: (base: string) => string
) => Root | void;

export interface RenderOptions {
  readonly preprocess?: MarkdownPreprocessor | readonly MarkdownPreprocessor[];
  readonly transform?: MarkdownAstTransform;
  /** IDs owned by the surrounding page, outside this Markdown document. */
  readonly reservedIds?: readonly string[];
  /** Namespace every final HTML ID and references to targets inside this fragment. */
  readonly idPrefix?: string;
  readonly eagerImages?: boolean;
}

export interface RenderedMarkdown {
  readonly html: string;
  /** Original final-HAST ID → emitted ID; identity mapping without idPrefix. */
  readonly localIds: ReadonlyMap<string, string>;
}
