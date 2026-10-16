import type { Heading, ListItem } from 'mdast';

export type TocGroup = { readonly title: string };

declare module 'mdast' {
  interface Data {
    tocTitle?: string;
    tocContainer?: boolean;
  }
}

export type TocEntry = {
  readonly depth: Heading['depth'];
  readonly slug: string;
  readonly title: string;
  readonly group?: TocGroup;
};

export type TocBuildResult = {
  readonly items: readonly ListItem[];
  readonly nextIndex: number;
};
