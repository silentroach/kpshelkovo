import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compareRuText } from '@shelkovo/format';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import { parseContentDate } from './content-date';
import { normalizeTagKey } from './news/schema';
import { STATUS_KINDS } from './status/schema';
import {
  buildSitemapMetadataIndex,
  type SitemapMetadataIndex,
  type SitemapMeetingInput,
  type SitemapNewsArticleInput,
  type SitemapKbPageInput,
  type SitemapSettlementInput,
  type SitemapStatusIncidentInput,
  type SitemapContactInput,
} from './sitemap';

type YamlRecord = Record<string, unknown>;
type SitemapDateInput = z.output<typeof SitemapDateInputSchema>;
type SitemapDataIssue = {
  readonly path: readonly PropertyKey[];
  readonly message: string;
};

interface MarkdownParts {
  readonly frontmatter: YamlRecord;
  readonly body: string;
}

const KB_NOINDEX_FLAG = 'noindex';

const SitemapDateInputSchema = z.union([z.string(), z.date()]);
const NewsArticleFrontmatterSchema = z
  .object({
    date: SitemapDateInputSchema,
    tags: z.array(z.string()).default([]),
  })
  .passthrough();
const StatusIncidentFrontmatterSchema = z
  .object({
    service: z.string(),
    kind: z.enum(STATUS_KINDS),
    started_at: SitemapDateInputSchema,
    ended_at: SitemapDateInputSchema.optional(),
  })
  .passthrough();
const SettlementSourceSchema = z
  .object({
    date_checked: SitemapDateInputSchema,
  })
  .passthrough();
const SettlementSitemapSchema = z
  .object({
    slug: z.string(),
    sources: z.array(SettlementSourceSchema).default([]),
  })
  .passthrough();
const MeetingSitemapSchema = z
  .object({
    date: SitemapDateInputSchema,
    updated_at: SitemapDateInputSchema.optional(),
  })
  .passthrough();
const KbPageFrontmatterSchema = z
  .object({
    flags: z.array(z.string()).default([]),
  })
  .passthrough();
const ContactFrontmatterSchema = z
  .object({
    category: z.string(),
    slug: z.string(),
    updated_at: SitemapDateInputSchema,
  })
  .passthrough();

const newsArticlesDir = fileURLToPath(
  new URL('../data/news/articles/', import.meta.url),
);
const statusIncidentsDir = fileURLToPath(
  new URL('../data/status/incidents/', import.meta.url),
);
const settlementsDir = fileURLToPath(
  new URL('../data/compare/settlements/', import.meta.url),
);
const meetingsDir = fileURLToPath(
  new URL('../data/meetings/', import.meta.url),
);
const kbPagesDir = fileURLToPath(new URL('../data/kb/', import.meta.url));
const contactsDir = fileURLToPath(
  new URL('../data/contacts/', import.meta.url),
);

const formatYamlIssue = (issue: SitemapDataIssue): string => {
  const path = issue.path.map(String).join('.');

  return `${path || 'value'}: ${issue.message}`;
};

const parseYamlObject = (source: string, context: string): YamlRecord => {
  let parsed: unknown;

  try {
    parsed = parseYaml(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`${context} has invalid YAML: ${message}`);
  }

  if (typeof parsed !== 'object' || !parsed || Array.isArray(parsed)) {
    throw new Error(`${context} must be a YAML object`);
  }

  return parsed as YamlRecord;
};

const parseYamlFile = (path: string): YamlRecord =>
  parseYamlObject(readFileSync(path, 'utf8'), path);

const parseSitemapData = <T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string,
): T => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const details = result.error.issues.map(formatYamlIssue).join('; ');

    throw new Error(`${context} has invalid sitemap data: ${details}`);
  }

  return result.data;
};

const parseFrontmatterInput = (
  frontmatter: string | YamlRecord,
  context: string,
): YamlRecord =>
  typeof frontmatter === 'string'
    ? parseYamlObject(frontmatter, context)
    : frontmatter;

const markdownParts = (path: string): MarkdownParts => {
  const lines = readFileSync(path, 'utf8').replaceAll('\r\n', '\n').split('\n');
  const start = lines[0];

  if (start !== '---') {
    throw new Error(`markdown frontmatter is required in ${path}`);
  }

  const end = lines.findIndex((line, index) => index > 0 && line === '---');

  if (end < 0) {
    throw new Error(
      `markdown frontmatter closing marker is required in ${path}`,
    );
  }

  const frontmatter = lines.slice(1, end).join('\n');

  return {
    frontmatter: parseYamlObject(frontmatter, `${path} frontmatter`),
    body: lines.slice(end + 1).join('\n'),
  };
};

function listFiles(root: string, extension: string): readonly string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(path, extension));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(path);
    }
  }

  return files.sort(compareRuText);
}

const relativeEntryId = (
  root: string,
  path: string,
  extension: string,
): string => {
  const entry = relative(root, path).replaceAll('\\', '/');
  const stem = entry.endsWith(extension)
    ? entry.slice(0, -extension.length)
    : entry;

  return stem.endsWith('/index') ? stem.slice(0, -'/index'.length) : stem;
};

const parseTimestamp = (value: SitemapDateInput, context: string): string => {
  const timestamp = parseContentDate(value);

  if (!timestamp) {
    throw new Error(`${context} must use a supported date format`);
  }

  return timestamp.hasTime
    ? timestamp.iso
    : `${timestamp.year}-${timestamp.month}-${timestamp.day}`;
};

const newsTags = (
  tags: readonly string[],
): readonly { readonly url: string }[] =>
  tags.map((tag) => ({
    url: `/news/tags/${normalizeTagKey(tag)}/`,
  }));

const loadNewsArticlesForSitemap = (): readonly SitemapNewsArticleInput[] =>
  listFiles(newsArticlesDir, '.md').map((path) => {
    const id = relativeEntryId(newsArticlesDir, path, '.md');
    const [year, month, entry] = id.split('/');
    const context = `news article ${id}`;
    const { frontmatter } = markdownParts(path);
    const article = parseSitemapData(
      NewsArticleFrontmatterSchema,
      frontmatter,
      `${context} frontmatter`,
    );
    const publishedIso = parseTimestamp(article.date, `${context} date`);

    if (!year || !month || !entry) {
      throw new Error(`${context} must resolve to YYYY/MM/[entry] with date`);
    }

    return {
      url: `/news/${year}/${month}/${entry}/`,
      publishedIso,
      year: Number(year),
      month: Number(month),
      tags: newsTags(article.tags),
    };
  });

const loadStatusIncidentsForSitemap =
  (): readonly SitemapStatusIncidentInput[] =>
    listFiles(statusIncidentsDir, '.md')
      .filter((path) => !path.endsWith('/AGENTS.md'))
      .map((path) => {
        const id = relativeEntryId(statusIncidentsDir, path, '.md');
        const [year, month, slug] = id.split('/');
        const context = `status incident ${id}`;
        const { frontmatter, body } = markdownParts(path);
        const incident = parseSitemapData(
          StatusIncidentFrontmatterSchema,
          frontmatter,
          `${context} frontmatter`,
        );

        if (!year || !month || !slug) {
          throw new Error(
            `${context} must resolve to YYYY/MM/[slug] with service and started_at`,
          );
        }

        return {
          url: `/status/incidents/${year}/${month}/${slug}/`,
          service: incident.service,
          kind: incident.kind,
          startedIso: parseTimestamp(
            incident.started_at,
            `${context} started_at`,
          ),
          ...(incident.ended_at
            ? {
                endedIso: parseTimestamp(
                  incident.ended_at,
                  `${context} ended_at`,
                ),
              }
            : {}),
          hasPage: body.trim().length > 0,
        };
      });

const loadSettlementsForSitemap = (): readonly SitemapSettlementInput[] =>
  listFiles(settlementsDir, '.yaml')
    .filter((path) => !path.endsWith('/_template.yaml'))
    .map((path) => {
      const settlement = parseSitemapData(
        SettlementSitemapSchema,
        parseYamlFile(path),
        `settlement ${path}`,
      );

      const sources = settlement.sources.map((source) => ({
        dateChecked: parseTimestamp(
          source.date_checked,
          `settlement ${settlement.slug} source date_checked`,
        ),
      }));

      return {
        slug: settlement.slug,
        sources,
      };
    });

const loadMeetingsForSitemap = (): readonly SitemapMeetingInput[] =>
  listFiles(meetingsDir, '.yaml')
    .filter((path) => path.endsWith('/index.yaml'))
    .map((path) => {
      const slug = relativeEntryId(meetingsDir, path, '.yaml');
      const context = `meeting ${slug}`;
      const meeting = parseSitemapData(
        MeetingSitemapSchema,
        parseYamlFile(path),
        context,
      );

      return {
        url: `/meetings/${slug}/`,
        dateIso: parseTimestamp(meeting.date, `${context} date`),
        ...(meeting.updated_at
          ? {
              updatedIso: parseTimestamp(
                meeting.updated_at,
                `${context} updated_at`,
              ),
            }
          : {}),
      };
    });

const kbPageUrl = (id: string): string => (id ? `/kb/${id}/` : '/kb/');

export const kbPageSitemapInput = (
  id: string,
  frontmatter: string | YamlRecord,
): SitemapKbPageInput => {
  const context = `kb page ${id || 'index'} frontmatter`;
  const page = parseSitemapData(
    KbPageFrontmatterSchema,
    parseFrontmatterInput(frontmatter, context),
    context,
  );

  return {
    url: kbPageUrl(id),
    excludeFromSitemap: page.flags.includes(KB_NOINDEX_FLAG),
  };
};

export const contactSitemapInput = (
  frontmatter: string | YamlRecord,
): SitemapContactInput => {
  const context = 'contact frontmatter';
  const contact = parseSitemapData(
    ContactFrontmatterSchema,
    parseFrontmatterInput(frontmatter, context),
    context,
  );

  return {
    category: contact.category,
    url: `/sarafan/${contact.category}/${contact.slug}/`,
    updatedIso: parseTimestamp(contact.updated_at, `${context} updated_at`),
  };
};

const loadKbPagesForSitemap = (): readonly SitemapKbPageInput[] =>
  listFiles(kbPagesDir, '.md')
    .filter((path) => !path.endsWith('/AGENTS.md'))
    .map((path) => {
      const id = relativeEntryId(kbPagesDir, path, '.md');
      const { frontmatter } = markdownParts(path);

      return kbPageSitemapInput(id, frontmatter);
    });

const loadContactsForSitemap = (): readonly SitemapContactInput[] =>
  listFiles(contactsDir, '.md')
    .filter((path) => !path.endsWith('/AGENTS.md'))
    .map((path) => {
      const { frontmatter } = markdownParts(path);

      return contactSitemapInput(frontmatter);
    });

export const loadSitemapMetadataIndex =
  async (): Promise<SitemapMetadataIndex> =>
    buildSitemapMetadataIndex({
      newsArticles: loadNewsArticlesForSitemap(),
      statusIncidents: loadStatusIncidentsForSitemap(),
      settlements: loadSettlementsForSitemap(),
      meetings: loadMeetingsForSitemap(),
      kbPages: loadKbPagesForSitemap(),
      contacts: loadContactsForSitemap(),
    });
