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
}

export interface PreprocessedSiteMarkdown {
  readonly markdown: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
}
