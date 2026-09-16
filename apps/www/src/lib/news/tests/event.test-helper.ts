import { mapRawEvent } from '@/lib/events/mapper';
import { RawEventSchema } from '@/lib/events/raw-schema';
import type { RawEventInput } from '@/lib/events/raw-schema';
import type { Place } from '@/lib/places/types';

export const newsEventRecord = (
  input: Partial<RawEventInput> = {},
  body = 'Описание календарного события.',
  places?: ReadonlyMap<string, Place>
) =>
  mapRawEvent(
    {
      id: 'meeting',
      data: RawEventSchema.parse({
        slug: 'meeting',
        title: 'Встреча по регламенту',
        category: 'meetings',
        starts_at: '31.05.2026 19:00',
        source_url: 'https://example.com/source',
        ...input
      }),
      body
    },
    undefined,
    places
  );
