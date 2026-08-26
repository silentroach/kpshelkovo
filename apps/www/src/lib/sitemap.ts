import { ChangeFreqEnum, type SitemapItem } from '@astrojs/sitemap';
import { compareRuText, padNumber } from '@shelkovo/format';

export interface SitemapMetadata {
  readonly lastmod?: string;
  readonly changefreq?: SitemapItem['changefreq'];
  readonly excludeFromSitemap?: true;
}

export type SitemapMetadataIndex = ReadonlyMap<string, SitemapMetadata>;

export interface SitemapNewsArticleInput {
  readonly url: string;
  readonly publishedIso: string;
  readonly updatedIso?: string;
  readonly year: number;
  readonly month: number;
  readonly tags: readonly {
    readonly url: string;
  }[];
}

export interface SitemapStatusIncidentInput {
  readonly url: string;
  readonly service: string;
  readonly startedIso: string;
  readonly endedIso?: string;
  readonly hasPage: boolean;
}

export interface SitemapSettlementInput {
  readonly slug: string;
  readonly sources: readonly {
    readonly dateChecked: string;
  }[];
}

export interface SitemapMeetingInput {
  readonly url: string;
  readonly dateIso: string;
  readonly updatedIso?: string;
}

export interface SitemapKbPageInput {
  readonly url: string;
  readonly excludeFromSitemap: boolean;
}

export interface SitemapContactInput {
  readonly category: string;
  readonly url: string;
  readonly updatedIso: string;
}

export interface SitemapMetadataSourceData {
  readonly newsArticles: readonly SitemapNewsArticleInput[];
  readonly statusIncidents: readonly SitemapStatusIncidentInput[];
  readonly settlements: readonly SitemapSettlementInput[];
  readonly meetings: readonly SitemapMeetingInput[];
  readonly kbPages: readonly SitemapKbPageInput[];
  readonly contacts: readonly SitemapContactInput[];
}

const EXTENSION = /\.[^/]+$/u;
const CHANGEFREQ = {
  daily: ChangeFreqEnum.DAILY,
  hourly: ChangeFreqEnum.HOURLY,
  monthly: ChangeFreqEnum.MONTHLY,
  yearly: ChangeFreqEnum.YEARLY,
} as const;

const decodePathname = (value: string): string => {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
};

export const sitemapPathKey = (url: string): string => {
  const pathname = decodePathname(
    new URL(url, 'https://local.invalid').pathname,
  )
    .replace(/\/index\.html$/iu, '/')
    .replace(/\/index$/iu, '/');
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (normalized === '/') {
    return normalized;
  }

  return normalized.endsWith('/') || EXTENSION.test(normalized)
    ? normalized
    : `${normalized}/`;
};

const timestampMs = (value: string): number => {
  const ms = Date.parse(value);

  if (!Number.isFinite(ms)) {
    throw new Error(`invalid sitemap lastmod "${value}"`);
  }

  return ms;
};

const laterLastmod = (
  a: string | undefined,
  b: string | undefined,
): string | undefined => {
  if (!a) {
    return b;
  }

  if (!b) {
    return a;
  }

  return timestampMs(a) >= timestampMs(b) ? a : b;
};

const maxLastmod = (values: readonly string[]): string | undefined =>
  values.reduce<string | undefined>(
    (latest, value) => laterLastmod(latest, value),
    undefined,
  );

const setMetadata = (
  index: Map<string, SitemapMetadata>,
  url: string,
  metadata: SitemapMetadata,
): void => {
  const key = sitemapPathKey(url);
  const current = index.get(key);
  const lastmod = laterLastmod(current?.lastmod, metadata.lastmod);
  const changefreq = metadata.changefreq ?? current?.changefreq;
  const next = {
    ...(lastmod ? { lastmod } : {}),
    ...(changefreq ? { changefreq } : {}),
    ...(current?.excludeFromSitemap ? { excludeFromSitemap: true } : {}),
  } satisfies SitemapMetadata;

  if (next.lastmod || next.changefreq || next.excludeFromSitemap) {
    index.set(key, next);
  }
};

const excludeFromSitemap = (
  index: Map<string, SitemapMetadata>,
  url: string,
): void => {
  const key = sitemapPathKey(url);
  const current = index.get(key);

  index.set(key, {
    lastmod: current?.lastmod,
    changefreq: current?.changefreq,
    excludeFromSitemap: true,
  });
};

const articleLastmod = (article: SitemapNewsArticleInput): string =>
  article.updatedIso ?? article.publishedIso;

const addNewsMetadata = (
  index: Map<string, SitemapMetadata>,
  articles: readonly SitemapNewsArticleInput[],
): void => {
  for (const article of articles) {
    const lastmod = articleLastmod(article);
    const year = padNumber(article.year, 4);
    const month = padNumber(article.month, 2);
    const daily = { lastmod, changefreq: CHANGEFREQ.daily };

    for (const path of [
      '/',
      '/news/',
      '/news/archive/',
      `/news/${year}/`,
      `/news/${year}/${month}/`,
      '/news/tags/',
    ]) {
      setMetadata(index, path, daily);
    }

    setMetadata(index, article.url, {
      lastmod,
      changefreq: CHANGEFREQ.monthly,
    });

    for (const tag of article.tags) {
      setMetadata(index, tag.url, daily);
    }
  }
};

const incidentLastmod = (incident: SitemapStatusIncidentInput): string =>
  incident.endedIso ?? incident.startedIso;

const addStatusMetadata = (
  index: Map<string, SitemapMetadata>,
  incidents: readonly SitemapStatusIncidentInput[],
): void => {
  for (const incident of incidents) {
    const lastmod = incidentLastmod(incident);
    const hourly = { lastmod, changefreq: CHANGEFREQ.hourly };

    setMetadata(index, '/', { lastmod, changefreq: CHANGEFREQ.daily });
    setMetadata(index, '/status/', hourly);
    setMetadata(index, `/status/${incident.service}/`, hourly);

    if (incident.hasPage) {
      setMetadata(index, incident.url, {
        lastmod,
        changefreq: incident.endedIso ? CHANGEFREQ.yearly : CHANGEFREQ.hourly,
      });
    }
  }
};

const addCompareMetadata = (
  index: Map<string, SitemapMetadata>,
  settlements: readonly SitemapSettlementInput[],
): void => {
  if (settlements.length === 0) {
    return;
  }

  setMetadata(index, '/815/compare/rating/', {
    changefreq: CHANGEFREQ.yearly,
  });

  for (const settlement of settlements) {
    const lastmod = maxLastmod(
      settlement.sources.map((source) => source.dateChecked),
    );

    if (!lastmod) {
      continue;
    }

    const monthly = { lastmod, changefreq: CHANGEFREQ.monthly };

    setMetadata(index, '/815/compare/', monthly);
    setMetadata(index, `/815/compare/settlements/${settlement.slug}/`, monthly);
  }
};

const meetingLastmod = (meeting: SitemapMeetingInput): string =>
  meeting.updatedIso ?? meeting.dateIso;

const addMeetingsMetadata = (
  index: Map<string, SitemapMetadata>,
  meetings: readonly SitemapMeetingInput[],
): void => {
  for (const meeting of meetings) {
    setMetadata(index, meeting.url, {
      lastmod: meetingLastmod(meeting),
      changefreq: CHANGEFREQ.yearly,
    });
  }
};

const addKbMetadata = (
  index: Map<string, SitemapMetadata>,
  pages: readonly SitemapKbPageInput[],
): void => {
  for (const page of pages) {
    if (page.excludeFromSitemap) {
      excludeFromSitemap(index, page.url);
    }
  }
};

const addContactsMetadata = (
  index: Map<string, SitemapMetadata>,
  contacts: readonly SitemapContactInput[],
): void => {
  const latest = maxLastmod(contacts.map((contact) => contact.updatedIso));

  if (latest) {
    setMetadata(index, '/sarafan/', {
      lastmod: latest,
      changefreq: CHANGEFREQ.monthly,
    });
  }

  for (const contact of contacts) {
    setMetadata(index, `/sarafan/${contact.category}/`, {
      lastmod: contact.updatedIso,
      changefreq: CHANGEFREQ.monthly,
    });

    setMetadata(index, contact.url, {
      lastmod: contact.updatedIso,
      changefreq: CHANGEFREQ.monthly,
    });
  }
};

export const buildSitemapMetadataIndex = (
  data: SitemapMetadataSourceData,
): SitemapMetadataIndex => {
  const index = new Map<string, SitemapMetadata>();

  addNewsMetadata(index, data.newsArticles);
  addStatusMetadata(index, data.statusIncidents);
  addCompareMetadata(index, data.settlements);
  addMeetingsMetadata(index, data.meetings);
  addKbMetadata(index, data.kbPages);
  addContactsMetadata(index, data.contacts);

  return new Map([...index.entries()].sort(([a], [b]) => compareRuText(a, b)));
};

export const applySitemapMetadata = (
  item: SitemapItem,
  index: SitemapMetadataIndex,
): SitemapItem | undefined => {
  const metadata = index.get(sitemapPathKey(item.url));

  if (metadata?.excludeFromSitemap) {
    return;
  }

  return metadata ? { ...item, ...metadata } : item;
};
