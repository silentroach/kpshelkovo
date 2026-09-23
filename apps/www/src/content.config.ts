import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

import { SettlementSchema } from '@/compare/lib/schema';
import { RawContactSchema } from '@/lib/contacts/raw-schema';
import { contactSourceId } from '@/lib/contacts/source';
import { rawMarkdownBody } from '@/lib/content-source';
import { RawEventSchema } from '@/lib/events/raw-schema';
import { eventSourceId } from '@/lib/events/source';
import { RawKbPageSchema } from '@/lib/kb/raw-schema';
import { kbPageSourceId } from '@/lib/kb/source';
import { RawMeetingSchema, RawMeetingTranscriptSchema } from '@/lib/meetings/raw-schema';
import { meetingSourceId, meetingTranscriptYamlId } from '@/lib/meetings/source';
import { RawNewsAuthorSchema, createRawNewsArticleSchema } from '@/lib/news/raw-schema';
import { articleSourceId, newsArchiveSummaryId } from '@/lib/news/source';
import { RawParcelSchema } from '@/lib/parcels/raw-schema';
import { parcelSourceId } from '@/lib/parcels/source';
import { RawPersonProfileSchema } from '@/lib/people/raw-schema';
import { personSourceId } from '@/lib/people/source';
import { RawPlaceSchema } from '@/lib/places/raw-schema';
import { placeSourceId } from '@/lib/places/source';
import { RawReviewSchema } from '@/lib/reviews/raw-schema';
import { reviewSourceId } from '@/lib/reviews/source';
import { RawStatusIncidentSchema } from '@/lib/status/raw-schema';
import { statusSourceId } from '@/lib/status/source';

const events = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!AGENTS.md', '!**/AGENTS.md'],
    base: './src/data/events',
    generateId: ({ entry, data, base }) =>
      eventSourceId(entry, data, () => rawMarkdownBody(base, entry))
  }),
  schema: RawEventSchema
});

const newsAuthors = defineCollection({
  loader: glob({
    pattern: '**/*.yaml',
    base: './src/data/news/authors'
  }),
  schema: RawNewsAuthorSchema
});

const newsArticles = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/data/news/articles',
    generateId: ({ entry, data }) => articleSourceId(entry, data)
  }),
  schema: ({ image }) => createRawNewsArticleSchema(image)
});

const newsArchiveSummaries = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!AGENTS.md', '!**/AGENTS.md'],
    base: './src/data/news/summaries',
    generateId: ({ entry, base }) => newsArchiveSummaryId(entry, () => rawMarkdownBody(base, entry))
  }),
  schema: z.object({}).strict()
});

const statusIncidents = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!AGENTS.md', '!**/AGENTS.md'],
    base: './src/data/status/incidents',
    generateId: ({ entry, data, base }) =>
      statusSourceId(entry, data, () => rawMarkdownBody(base, entry))
  }),
  schema: RawStatusIncidentSchema
});

const peopleProfiles = defineCollection({
  loader: glob({
    pattern: ['*.md', '!AGENTS.md'],
    base: './src/data/people',
    generateId: ({ entry }) => personSourceId(entry)
  }),
  schema: RawPersonProfileSchema
});

const places = defineCollection({
  loader: glob({
    pattern: ['*.md', '!AGENTS.md'],
    base: './src/data/places',
    generateId: ({ entry }) => placeSourceId(entry)
  }),
  schema: RawPlaceSchema
});

const parcels = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/data/parcels',
    generateId: ({ entry }) => parcelSourceId(entry)
  }),
  schema: RawParcelSchema
});

const kbPages = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!AGENTS.md', '!**/AGENTS.md'],
    base: './src/data/kb',
    generateId: ({ entry }) => kbPageSourceId(entry)
  }),
  schema: RawKbPageSchema
});

const meetingEntries = defineCollection({
  loader: glob({
    pattern: '*/index.yaml',
    base: './src/data/meetings',
    generateId: ({ entry }) => meetingSourceId(entry)
  }),
  schema: RawMeetingSchema
});

const meetingTranscripts = defineCollection({
  loader: glob({
    pattern: '*/transcript*.yaml',
    base: './src/data/meetings',
    generateId: ({ entry }) => meetingTranscriptYamlId(entry)
  }),
  schema: RawMeetingTranscriptSchema
});

const reviews = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!AGENTS.md', '!**/AGENTS.md'],
    base: './src/data/reviews',
    generateId: ({ entry, data, base }) =>
      reviewSourceId(entry, data, () => rawMarkdownBody(base, entry))
  }),
  schema: RawReviewSchema
});

const contacts = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!AGENTS.md', '!**/AGENTS.md'],
    base: './src/data/contacts',
    generateId: ({ entry, data }) => contactSourceId(entry, data)
  }),
  schema: RawContactSchema
});

const settlements = defineCollection({
  loader: glob({
    pattern: '[!_]*.yaml',
    base: './src/data/compare/settlements'
  }),
  schema: SettlementSchema
});

export const collections = {
  events,
  newsAuthors,
  newsArticles,
  newsArchiveSummaries,
  settlements,
  statusIncidents,
  kbPages,
  peopleProfiles,
  places,
  parcels,
  meetingEntries,
  meetingTranscripts,
  reviews,
  contacts
};
