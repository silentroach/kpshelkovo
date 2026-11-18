import type {
  EntityMentionSourceEntity,
  EntityMentionTarget,
  SiteMentionRegistry
} from '../mentions';
import type { EditorialMapSelectionResolver } from './editorial-maps.types';

export type PreprocessedSiteMarkdownBody = string;

export interface RenderEntityMentionsOptions {
  readonly registry: SiteMentionRegistry;
  readonly context: string;
  readonly sourceEntity?: EntityMentionSourceEntity;
}

export interface RenderSiteMarkdownOptions {
  readonly mentions?: RenderEntityMentionsOptions;
  readonly eagerImages?: boolean;
  /** Enable for KB bodies whose template provides table styling. */
  readonly allowTables?: boolean;
  /** Enable author-written wide/mobile alternatives in KB. */
  readonly adaptive?: boolean;
  /** Enable native responsive contents disclosure on KB pages. */
  readonly tocDisclosure?: boolean;
  /** Enable only for news/KB bodies whose templates load editorial map assets. */
  readonly editorialMaps?: boolean;
  readonly editorialMapResolver?: EditorialMapSelectionResolver;
  readonly editorialMapSource?: string;
  /** IDs already used by the surrounding page (outside its Markdown body). */
  readonly reservedIds?: readonly string[];
  /** Namespace this body's HTML targets independently from surrounding bodies. */
  readonly idPrefix?: string;
}

export interface PreprocessedSiteMarkdown {
  readonly markdown: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
}
