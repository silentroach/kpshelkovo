import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { RawKbPageSchema } from '@/lib/kb/raw-schema';
import { RawContactSchema } from './lib/contacts/raw-schema';
import { CONTACT_CATEGORIES, CONTACT_SLUG } from './lib/contacts/schema';
import { parseNewsTimestampInput } from './lib/news/date';
import {
  RawNewsAuthorSchema,
  createRawNewsArticleSchema,
} from './lib/news/raw-schema';
import {
  RawMeetingSchema,
  RawMeetingTranscriptSchema,
} from './lib/meetings/raw-schema';
import { RawPersonProfileSchema } from './lib/people/raw-schema';
import { RawPlaceSchema } from './lib/places/raw-schema';
import { PLACE_SLUG } from './lib/places/schema';
import { RawReviewSchema } from './lib/reviews/raw-schema';
import {
  REVIEW_DATE,
  REVIEW_SLUG,
  reviewIdFromParts,
} from './lib/reviews/schema';
import { RawStatusIncidentSchema } from './lib/status/raw-schema';
import { parseStatusTimestampInput } from './lib/status/schema';
import { SettlementSchema } from './compare/lib/schema';

const YEAR = /^\d{4}$/;
const MONTH = /^(0[1-9]|1[0-2])$/;
const DAY_KEY = /^(?:0?[1-9]|[12]\d|3[01])$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MEETING_TRANSCRIPT_FILE =
  /^transcript(?:-(?<part>[2-9]|[1-9]\d+))?\.yaml$/;
const MARKDOWN_FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n)*/u;
const STATUS_INCIDENTS_DIR = fileURLToPath(
  new URL('./data/status/incidents/', import.meta.url),
);
const REVIEWS_DIR = fileURLToPath(new URL('./data/reviews/', import.meta.url));
const NEWS_SUMMARIES_DIR = fileURLToPath(
  new URL('./data/news/summaries/', import.meta.url),
);

interface DateParts {
  readonly year: string;
  readonly month: string;
  readonly day: string;
}

const trimMarkdown = (entry: string): string => entry.replace(/\.md$/i, '');

const rawMarkdownBody = (root: string, entry: string): string =>
  readFileSync(join(root, entry), 'utf8').replace(MARKDOWN_FRONTMATTER, '');

const articleId = (entry: string): string =>
  trimMarkdown(entry).replace(/\/index$/i, '');

const hasDate = (data: unknown): data is { readonly date: unknown } =>
  typeof data === 'object' && data !== null && 'date' in data;

function readDateParts(data: unknown): readonly DateParts[] {
  if (!hasDate(data)) {
    return [];
  }

  const parsed = parseNewsTimestampInput(data.date);

  return parsed
    ? [
        {
          year: parsed.year,
          month: parsed.month,
          day: parsed.day,
        },
      ]
    : [];
}

function fail(kind: 'article', entry: string, reason: string): never {
  throw new Error(`news ${kind} path \"${entry}\" ${reason}`);
}

function failStatus(entry: string, reason: string): never {
  throw new Error(`status incident path \"${entry}\" ${reason}`);
}

function failNewsSummary(entry: string, reason: string): never {
  throw new Error(`news archive summary path \"${entry}\" ${reason}`);
}

function failPerson(entry: string, reason: string): never {
  throw new Error(`person profile path \"${entry}\" ${reason}`);
}

function failPlace(entry: string, reason: string): never {
  throw new Error(`place path \"${entry}\" ${reason}`);
}

function failMeeting(entry: string, reason: string): never {
  throw new Error(`meeting data path \"${entry}\" ${reason}`);
}

function failKbPage(entry: string, reason: string): never {
  throw new Error(`kb page path \"${entry}\" ${reason}`);
}

function failReview(entry: string, reason: string): never {
  throw new Error(`review path \"${entry}\" ${reason}`);
}

function failContact(entry: string, reason: string): never {
  throw new Error(`contact path \"${entry}\" ${reason}`);
}

const hasReviewIdentity = (
  data: unknown,
): data is { readonly published_at: unknown; readonly slug: unknown } => {
  if (typeof data !== 'object' || !data) {
    return false;
  }

  const input = data as {
    readonly published_at?: unknown;
    readonly slug?: unknown;
  };

  return input.published_at !== undefined && input.slug !== undefined;
};

const CONTACT_CATEGORY_VALUES = new Set<string>(CONTACT_CATEGORIES);

const readContactIdentity = (
  data: unknown,
): { readonly category?: string; readonly slug?: string } => {
  if (typeof data !== 'object' || !data || Array.isArray(data)) {
    return {};
  }

  const input = data as {
    readonly category?: unknown;
    readonly slug?: unknown;
  };

  return {
    category: input.category === undefined ? undefined : String(input.category),
    slug: input.slug === undefined ? undefined : String(input.slug),
  };
};

function contactSourceId(entry: string, data: unknown): string {
  if (!entry.endsWith('.md')) {
    failContact(entry, 'must be a Markdown file');
  }

  const { category, slug } = readContactIdentity(data);

  if (!slug) {
    failContact(entry, 'must define slug');
  }

  if (!category) {
    failContact(entry, 'must define category');
  }

  if (!CONTACT_SLUG.test(slug)) {
    failContact(
      entry,
      'slug must use lower-case Latin letters, digits, and hyphen',
    );
  }

  if (!CONTACT_CATEGORY_VALUES.has(category)) {
    failContact(entry, `category "${category}" is unknown`);
  }

  return `${category}/${slug}`;
}

function reviewSourceId(entry: string, data: unknown): string {
  if (!entry.endsWith('.md')) {
    failReview(entry, 'must be a Markdown file');
  }

  if (!hasReviewIdentity(data)) {
    failReview(entry, 'must define published_at and slug');
  }

  const publishedIso =
    data.published_at instanceof Date
      ? data.published_at.toISOString().slice(0, 10)
      : String(data.published_at);
  const slug = String(data.slug);

  if (!REVIEW_DATE.test(publishedIso)) {
    failReview(entry, 'published_at must use YYYY-MM-DD');
  }

  if (!REVIEW_SLUG.test(slug)) {
    failReview(
      entry,
      'slug must use lower-case Latin letters, digits, and hyphen',
    );
  }

  const body = rawMarkdownBody(REVIEWS_DIR, entry);

  if (!body.trim()) {
    failReview(entry, 'body is required');
  }

  return reviewIdFromParts({ publishedIso, slug });
}

function validateKbPageSource(entry: string, sourceId: string): void {
  const parts = sourceId.split('/');

  if (parts.some((part) => part.length === 0)) {
    failKbPage(entry, 'must not contain empty path segments');
  }

  const routeSegments =
    parts[parts.length - 1] === 'index' ? parts.slice(0, -1) : parts;

  for (const segment of routeSegments) {
    if (!SLUG.test(segment)) {
      failKbPage(
        entry,
        `segment \"${segment}\" must use lower-case Latin letters, digits, and hyphen`,
      );
    }
  }
}

function kbPageSourceId(entry: string): string {
  const sourceId = trimMarkdown(entry);

  validateKbPageSource(entry, sourceId);

  return sourceId;
}

function meetingYamlId(
  entry: string,
  fileName: 'index.yaml' | 'transcript.yaml',
): string {
  const parts = entry.split('/');

  if (parts.length !== 2 || parts[1] !== fileName) {
    failMeeting(entry, `must be exactly [slug]/${fileName}`);
  }

  const [slug] = parts;

  if (!SLUG.test(slug)) {
    failMeeting(
      entry,
      'slug must use lower-case Latin letters, digits, and hyphen',
    );
  }

  return slug;
}

function meetingTranscriptYamlId(entry: string): string {
  const parts = entry.split('/');

  if (parts.length !== 2) {
    failMeeting(
      entry,
      'must be exactly [slug]/transcript.yaml or [slug]/transcript-N.yaml',
    );
  }

  const [slug, fileName] = parts;
  const match = fileName?.match(MEETING_TRANSCRIPT_FILE);

  if (!slug || !SLUG.test(slug)) {
    failMeeting(
      entry,
      'slug must use lower-case Latin letters, digits, and hyphen',
    );
  }

  if (!match) {
    failMeeting(
      entry,
      'must use transcript.yaml or transcript-N.yaml with N starting from 2',
    );
  }

  return `${slug}/${match.groups?.part ?? '1'}`;
}

function validateArticleEntry(entry: string, data: unknown): void {
  const id = articleId(entry);
  const parts = id.split('/');

  if (parts.length !== 3) {
    fail('article', entry, 'must resolve to YYYY/MM/[entry]');
  }

  const [year, month, key] = parts;

  if (!YEAR.test(year) || !MONTH.test(month) || key.length === 0) {
    fail(
      'article',
      entry,
      'must use YYYY/MM/[entry] with numeric year and month',
    );
  }

  const dates = readDateParts(data);

  if (
    dates.length > 0 &&
    !dates.some((date) => date.year === year && date.month === month)
  ) {
    fail('article', entry, 'must match the frontmatter date year and month');
  }

  if (!/^\d+$/.test(key)) {
    return;
  }

  if (!DAY_KEY.test(key)) {
    fail('article', entry, 'numeric day keys must be valid calendar days');
  }

  if (
    dates.length > 0 &&
    !dates.some((date) => Number(key) === Number(date.day))
  ) {
    fail(
      'article',
      entry,
      'numeric day keys must match the frontmatter date day',
    );
  }
}

function newsArchiveSummaryId(entry: string): string {
  if (!entry.endsWith('.md')) {
    failNewsSummary(entry, 'must be a Markdown file');
  }

  const [year, period, ...rest] = trimMarkdown(entry).split('/');

  if (
    rest.length > 0 ||
    !YEAR.test(year) ||
    (period !== 'index' && !MONTH.test(period))
  ) {
    failNewsSummary(entry, 'must use YYYY/index.md or YYYY/MM.md');
  }

  if (!rawMarkdownBody(NEWS_SUMMARIES_DIR, entry).trim()) {
    failNewsSummary(entry, 'body is required');
  }

  return period === 'index' ? year : `${year}/${period}`;
}

const hasStartedAt = (
  data: unknown,
): data is { readonly started_at: unknown } =>
  typeof data === 'object' && data !== null && 'started_at' in data;

function validateStatusEntry(entry: string, data: unknown): void {
  const id = trimMarkdown(entry);
  const parts = id.split('/');

  if (parts.length !== 3) {
    failStatus(entry, 'must resolve to YYYY/MM/[slug]');
  }

  const [year, month, slug] = parts;

  if (!YEAR.test(year) || !MONTH.test(month) || slug.length === 0) {
    failStatus(entry, 'must use YYYY/MM/[slug] with numeric year and month');
  }

  if (!SLUG.test(slug)) {
    failStatus(
      entry,
      'slug must use lower-case Latin letters, digits, and hyphen',
    );
  }

  const started = hasStartedAt(data)
    ? parseStatusTimestampInput(data.started_at)
    : undefined;

  if (started && (started.year !== year || started.month !== month)) {
    failStatus(entry, 'must match the frontmatter started_at year and month');
  }

  const body = rawMarkdownBody(STATUS_INCIDENTS_DIR, entry);

  if (body.length > 0 && body.trim().length === 0) {
    failStatus(entry, 'body must not be blank');
  }
}

function validatePersonEntry(entry: string): void {
  if (entry.includes('/')) {
    failPerson(entry, 'must live directly under src/data/people');
  }

  const slug = trimMarkdown(entry);

  if (!SLUG.test(slug)) {
    failPerson(
      entry,
      'slug must use lower-case Latin letters, digits, and hyphen',
    );
  }
}

function placeSourceId(entry: string): string {
  if (!entry.endsWith('.md') || entry.includes('/')) {
    failPlace(entry, 'must be a Markdown file directly under src/data/places');
  }

  const slug = trimMarkdown(entry);

  if (!PLACE_SLUG.test(slug)) {
    failPlace(
      entry,
      'slug must use lower-case Latin letters, digits, and hyphen',
    );
  }

  return slug;
}

const newsAuthors = defineCollection({
  loader: glob({
    pattern: '**/*.yaml',
    base: './src/data/news/authors',
  }),
  schema: RawNewsAuthorSchema,
});

const newsArticles = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/data/news/articles',
    generateId: ({ entry, data }) => {
      validateArticleEntry(entry, data);
      return articleId(entry);
    },
  }),
  schema: ({ image }) => createRawNewsArticleSchema(image),
});

const newsArchiveSummaries = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!AGENTS.md', '!**/AGENTS.md'],
    base: './src/data/news/summaries',
    generateId: ({ entry }) => newsArchiveSummaryId(entry),
  }),
  schema: z.object({}).strict(),
});

const statusIncidents = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!AGENTS.md', '!**/AGENTS.md'],
    base: './src/data/status/incidents',
    generateId: ({ entry, data }) => {
      validateStatusEntry(entry, data);
      return trimMarkdown(entry);
    },
  }),
  schema: RawStatusIncidentSchema,
});

const peopleProfiles = defineCollection({
  loader: glob({
    pattern: ['*.md', '!AGENTS.md'],
    base: './src/data/people',
    generateId: ({ entry }) => {
      validatePersonEntry(entry);
      return trimMarkdown(entry);
    },
  }),
  schema: RawPersonProfileSchema,
});

const places = defineCollection({
  loader: glob({
    pattern: ['*.md', '!AGENTS.md'],
    base: './src/data/places',
    generateId: ({ entry }) => placeSourceId(entry),
  }),
  schema: RawPlaceSchema,
});

const kbPages = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!AGENTS.md', '!**/AGENTS.md'],
    base: './src/data/kb',
    generateId: ({ entry }) => kbPageSourceId(entry),
  }),
  schema: RawKbPageSchema,
});

const meetingEntries = defineCollection({
  loader: glob({
    pattern: '*/index.yaml',
    base: './src/data/meetings',
    generateId: ({ entry }) => meetingYamlId(entry, 'index.yaml'),
  }),
  schema: RawMeetingSchema,
});

const meetingTranscripts = defineCollection({
  loader: glob({
    pattern: '*/transcript*.yaml',
    base: './src/data/meetings',
    generateId: ({ entry }) => meetingTranscriptYamlId(entry),
  }),
  schema: RawMeetingTranscriptSchema,
});

const reviews = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!AGENTS.md', '!**/AGENTS.md'],
    base: './src/data/reviews',
    generateId: ({ entry, data }) => reviewSourceId(entry, data),
  }),
  schema: RawReviewSchema,
});

const contacts = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!AGENTS.md', '!**/AGENTS.md'],
    base: './src/data/contacts',
    generateId: ({ entry, data }) => contactSourceId(entry, data),
  }),
  schema: RawContactSchema,
});

const settlements = defineCollection({
  loader: glob({
    pattern: '[!_]*.yaml',
    base: './src/data/compare/settlements',
  }),
  schema: SettlementSchema,
});

export const collections = {
  newsAuthors,
  newsArticles,
  newsArchiveSummaries,
  settlements,
  statusIncidents,
  kbPages,
  peopleProfiles,
  places,
  meetingEntries,
  meetingTranscripts,
  reviews,
  contacts,
};
