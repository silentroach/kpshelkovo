export const ENTITY_MENTION_ALTERNATE_LABEL_CASES = [
  'gen',
  'dat',
  'acc',
  'ins',
  'prep',
] as const;

export const ENTITY_MENTION_LABEL_CASES = [
  'nom',
  ...ENTITY_MENTION_ALTERNATE_LABEL_CASES,
] as const;

export const ENTITY_MENTION_TYPES = ['person', 'place'] as const;
export const SITE_MENTION_SECTIONS = [
  'news',
  'status',
  'reviews',
  'places',
  'people',
  'contacts',
] as const;
export const SITE_BACKLINK_KINDS = [
  'article',
  'incident',
  'review',
  'place',
  'person',
  'contact',
] as const;

export type EntityMentionType = (typeof ENTITY_MENTION_TYPES)[number];
export type SiteMentionSection = (typeof SITE_MENTION_SECTIONS)[number];
export type SiteBacklinkKind = (typeof SITE_BACKLINK_KINDS)[number];
export type EntityMentionAlternateLabelCase =
  (typeof ENTITY_MENTION_ALTERNATE_LABEL_CASES)[number];
export type EntityMentionLabelCase =
  (typeof ENTITY_MENTION_LABEL_CASES)[number];
export type EntityMentionLabelCaseForms = Readonly<
  Partial<Record<EntityMentionAlternateLabelCase, string>>
>;

export interface EntityMentionTarget {
  readonly type: EntityMentionType;
  readonly slug: string;
  readonly label: string;
  readonly labelCases?: EntityMentionLabelCaseForms;
  readonly htmlUrl: string;
  readonly markdownUrl: string;
  readonly linkTitle?: string;
  readonly linkContext?: string;
}

export interface EntityMentionEntityRef {
  readonly type: EntityMentionType;
  readonly slug: string;
}

export type EntityMentionSourceEntity = EntityMentionEntityRef;

export interface EntityMentionSourceUnit {
  readonly section: string;
  readonly kind: string;
  readonly id: string;
}

export interface EntityMentionSourceRef {
  readonly target: EntityMentionEntityRef;
  readonly source: EntityMentionSourceUnit;
  readonly title: string;
  readonly htmlUrl: string;
  readonly markdownUrl: string;
  readonly excerpt?: string;
  readonly mentionedAt?: string;
  readonly sortKey?: number;
  readonly sourceEntity?: EntityMentionSourceEntity;
}

export type EntityMentionSourceRefSource = Omit<
  EntityMentionSourceRef,
  'target'
>;

export interface EntityMentionGraphTarget {
  readonly type: EntityMentionType;
  readonly slug: string;
  readonly sections: ReadonlyMap<string, readonly EntityMentionSourceRef[]>;
}

export interface EntityMentionGraph {
  readonly targets: ReadonlyMap<string, EntityMentionGraphTarget>;
}

export interface SiteMentionRef {
  readonly section: SiteMentionSection;
  readonly kind: SiteBacklinkKind;
  readonly sourceId: string;
  readonly title: string;
  readonly htmlUrl: string;
  readonly markdownUrl: string;
  readonly excerpt?: string;
  readonly mentionedAt?: string;
  readonly sortKey?: number;
}

export interface SiteBacklinks {
  readonly news: readonly SiteMentionRef[];
  readonly status: readonly SiteMentionRef[];
  readonly reviews: readonly SiteMentionRef[];
  readonly places: readonly SiteMentionRef[];
  readonly people: readonly SiteMentionRef[];
  readonly contacts: readonly SiteMentionRef[];
}

export type SiteMentionRegistry = ReadonlyMap<string, EntityMentionTarget>;

export interface NormalizedEntityMentions {
  readonly markdown: string;
  readonly mentions: readonly EntityMentionTarget[];
}

const ENTITY_MENTION_LABEL_CASE_SET = new Set<string>(
  ENTITY_MENTION_LABEL_CASES,
);

export const ENTITY_MENTION_DEFAULT_LABEL_CASE = 'nom';

export const isEntityMentionLabelCase = (
  value: string,
): value is EntityMentionLabelCase => ENTITY_MENTION_LABEL_CASE_SET.has(value);
