import { buildSitemapMetadataIndex, type SitemapMetadataIndex } from './sitemap';

const SITEMAP_METADATA = Symbol.for('kpshelkovo.sitemap-metadata');

const sitemapDateIso = (iso: string, hasTime: boolean): string =>
  hasTime ? iso : iso.slice(0, 10);

const buildSitemapMetadataIndexFromDomainData = async (): Promise<SitemapMetadataIndex> => {
  const [newsArticles, statusIncidents, compare, meetings, kbPages, contacts] = await Promise.all([
    import('@/lib/news/load').then(({ loadNewsArticles }) => loadNewsArticles()),
    import('@/lib/status/load').then(({ loadStatusIncidents }) => loadStatusIncidents()),
    import('@/compare/lib/data').then(({ loadAllData }) => loadAllData()),
    import('@/lib/meetings/load').then(({ loadMeetings }) => loadMeetings()),
    import('@/lib/kb/load').then(({ loadKbPages }) => loadKbPages()),
    import('@/lib/contacts/load').then(({ loadContacts }) => loadContacts())
  ]);

  return buildSitemapMetadataIndex({
    newsArticles: newsArticles.map((article) => ({
      url: article.url,
      publishedIso: sitemapDateIso(article.publishedIso, !!article.time),
      year: article.year,
      month: article.month,
      tags: article.tags
    })),
    statusIncidents: statusIncidents.map((incident) => ({
      service: incident.service,
      startedIso: sitemapDateIso(incident.started.iso, incident.started.hasTime),
      endedIso: incident.ended
        ? sitemapDateIso(incident.ended.iso, incident.ended.hasTime)
        : undefined
    })),
    settlements: compare.settlements,
    meetings: meetings.map((meeting) => ({
      url: meeting.url,
      dateIso: sitemapDateIso(meeting.date.iso, meeting.date.hasTime),
      updatedIso: meeting.updatedAt
        ? sitemapDateIso(meeting.updatedAt.iso, meeting.updatedAt.hasTime)
        : undefined
    })),
    kbPages: kbPages.map((page) => ({
      url: page.url,
      excludeFromSitemap: page.flags.includes('noindex')
    })),
    contacts: contacts.map((contact) => ({
      category: contact.category,
      url: contact.url,
      updatedIso: contact.updatedIso
    }))
  });
};

export const loadSitemapMetadataIndex = (): Promise<SitemapMetadataIndex> => {
  const state = globalThis as typeof globalThis & {
    [SITEMAP_METADATA]?: Promise<SitemapMetadataIndex>;
  };

  state[SITEMAP_METADATA] ??= buildSitemapMetadataIndexFromDomainData();
  return state[SITEMAP_METADATA];
};
