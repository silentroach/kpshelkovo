import type { PreprocessedSiteMarkdownBody } from '../markdown/render';
import type { EntityMentionTarget } from '../mentions';
import type { NewsArea, NewsAuthorKind } from './schema';

export interface NewsAuthor {
  readonly id: string;
  readonly name: string;
  readonly kind: NewsAuthorKind;
  readonly shortName?: string;
  readonly url?: string;
  readonly role?: string;
}

export interface NewsTag {
  readonly label: string;
  readonly key: string;
  readonly url: string;
}

export interface NewsPhoto {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly caption?: PreprocessedSiteMarkdownBody;
}

export interface NewsAttachment {
  readonly title: string;
  readonly url: string;
  readonly type?: string;
  readonly size?: string;
}

export interface NewsCover {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}

export interface NewsEventCoordinates {
  readonly lat: number;
  readonly lng: number;
}

export interface NewsEventOrganizer {
  readonly name: string;
  readonly type: 'organization' | 'person';
}

export interface NewsEventPerformer {
  readonly name: string;
  readonly type: 'organization' | 'person';
}

export interface NewsEvent {
  readonly slug: string;
  readonly title: string;
  readonly description?: string;
  readonly startsAt: Date;
  readonly startsIso: string;
  readonly startsTime: string;
  readonly endsAt?: Date;
  readonly endsIso?: string;
  readonly endsTime?: string;
  readonly icsUrl: string;
  readonly location?: string;
  readonly coordinates?: NewsEventCoordinates;
  readonly organizer?: NewsEventOrganizer;
  readonly performer?: readonly NewsEventPerformer[];
}

export interface NewsArticle {
  readonly id: string;
  readonly title: string;
  readonly seo?: {
    readonly title?: string;
    readonly description?: string;
  };
  readonly author: NewsAuthor;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly entry: string;
  readonly url: string;
  readonly markdownUrl: string;
  readonly canonical: string;
  readonly publishedAt: Date;
  readonly publishedIso: string;
  readonly time?: string;
  readonly appliesToAllAreas: boolean;
  readonly areas: readonly NewsArea[];
  readonly tags: readonly NewsTag[];
  readonly pinned: boolean;
  readonly sourceUrl?: string;
  readonly cover?: NewsCover;
  readonly photos: readonly NewsPhoto[];
  readonly attachments: readonly NewsAttachment[];
  readonly events: readonly NewsEvent[];
  readonly summary: string;
  readonly body: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
}

export interface NewsListArticle {
  readonly id: string;
  readonly title: string;
  readonly author: NewsAuthor;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly entry: string;
  readonly url: string;
  readonly markdownUrl: string;
  readonly canonical: string;
  readonly publishedAt: Date;
  readonly publishedIso: string;
  readonly time?: string;
  readonly appliesToAllAreas: boolean;
  readonly areas: readonly NewsArea[];
  readonly tags: readonly NewsTag[];
  readonly pinned: boolean;
  readonly sourceUrl?: string;
  readonly cover?: NewsCover;
  readonly summary: string;
  readonly events: readonly NewsEvent[];
}

export interface NewsMonthArchive {
  readonly id: string;
  readonly year: number;
  readonly month: number;
  readonly url: string;
  readonly markdownUrl: string;
  readonly count: number;
  readonly articles: readonly NewsListArticle[];
}

export interface NewsYearArchive {
  readonly year: number;
  readonly url: string;
  readonly markdownUrl: string;
  readonly count: number;
  readonly months: readonly NewsMonthArchive[];
}

export interface NewsArchives {
  readonly years: readonly NewsYearArchive[];
  readonly byYear: ReadonlyMap<number, NewsYearArchive>;
  readonly byMonth: ReadonlyMap<string, NewsMonthArchive>;
}

export interface NewsTagPage {
  readonly id: string;
  readonly label: string;
  readonly key: string;
  readonly url: string;
  readonly markdownUrl: string;
  readonly count: number;
  readonly latest: readonly NewsListArticle[];
}

export interface NewsHomeData {
  readonly pinned: readonly NewsListArticle[];
  readonly latest: readonly NewsListArticle[];
}

export interface NewsDataset {
  readonly articles: readonly NewsArticle[];
  readonly home: NewsHomeData;
  readonly archives: NewsArchives;
  readonly tags: readonly NewsTagPage[];
  readonly byId: ReadonlyMap<string, NewsArticle>;
  readonly byTag: ReadonlyMap<string, NewsTagPage>;
}
