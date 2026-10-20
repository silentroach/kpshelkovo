import type { Heading } from 'mdast';

export interface AuthoredHeadingIds {
  readonly authoredIds: ReadonlyMap<Heading, string>;
  readonly reserveId: (base: string) => string;
}
