import { expect, it } from 'vitest';

import { mapRawEvent } from '../mapper';
import { RawEventSchema } from '../raw-schema';
import { buildEventRedirects } from '../redirects';

it('redirects all validated prior detail paths directly to the current canonical', () => {
  const event = mapRawEvent({
    id: 'stable-id',
    body: 'Описание мероприятия.',
    data: RawEventSchema.parse({
      title: 'Перенесённое мероприятие',
      slug: 'workshop',
      category: 'workshops',
      starts_at: '03.10.2026 18:00',
      source_url: 'https://example.com/source',
      aliases: ['/events/2026/08/workshop/', '/events/2026/09/workshop/']
    })
  });
  expect(buildEventRedirects([event])).toMatchInlineSnapshot(`
    "# Generated from validated event aliases. Do not edit.
    location = /events/2026/08/workshop/ { return 301 /events/2026/10/workshop/$is_args$args; }
    location = /events/2026/09/workshop/ { return 301 /events/2026/10/workshop/$is_args$args; }
    "
  `);
  expect(buildEventRedirects([])).not.toContain('location');
});
