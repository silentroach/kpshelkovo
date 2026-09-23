import type {
  EntityMentionSourceEntity,
  EntityMentionTarget,
  SiteMentionRegistry
} from '../mentions';

export type PreprocessedSiteMarkdownBody = string;

export interface RenderEntityMentionsOptions {
  readonly registry: SiteMentionRegistry;
  readonly context: string;
  readonly sourceEntity?: EntityMentionSourceEntity;
}

export interface RenderSiteMarkdownOptions {
  readonly mentions?: RenderEntityMentionsOptions;
  readonly eagerImages?: boolean;
  /** IDs already used by the surrounding page (outside its Markdown body). */
  readonly reservedIds?: readonly string[];
}

export interface PreprocessedSiteMarkdown {
  readonly markdown: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
}
