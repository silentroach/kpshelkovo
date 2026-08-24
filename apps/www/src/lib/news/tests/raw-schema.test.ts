import { describe, expect, it } from 'vitest';

import { RawNewsEventsSchema } from '../raw-schema';

const event = {
  title: 'Встреча по регламенту',
  starts_at: '31.05.2026 19:00',
};

const validationIssues = (input: unknown) => {
  const result = RawNewsEventsSchema.safeParse(input);

  if (result.success) {
    throw new Error('Expected news events validation to fail');
  }

  return result.error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
  }));
};

describe('RawNewsEventsSchema', () => {
  it('trims valid event text at the raw boundary', () => {
    expect(
      RawNewsEventsSchema.parse([
        {
          title: '  Встреча по регламенту  ',
          description: '  Обсудим новый регламент.  ',
          starts_at: '31.05.2026 19:00',
          ends_at: '31.05.2026 21:00',
          location: '  Эко-клуб  ',
          organizer: '  ОК Комфорт  ',
          performer: ['  Ведущий  '],
        },
      ]),
    ).toMatchInlineSnapshot(`
      [
        {
          "description": "Обсудим новый регламент.",
          "ends_at": "31.05.2026 21:00",
          "location": "Эко-клуб",
          "organizer": "ОК Комфорт",
          "performer": [
            "Ведущий",
          ],
          "starts_at": "31.05.2026 19:00",
          "title": "Встреча по регламенту",
        },
      ]
    `);
  });

  it.each([
    {
      name: 'start without time',
      input: [{ ...event, starts_at: '31.05.2026' }],
      message: 'events[].starts_at must use dd.mm.yyyy hh:mm and include time',
    },
    {
      name: 'end without time',
      input: [{ ...event, ends_at: '31.05.2026' }],
      message: 'events[].ends_at must use dd.mm.yyyy hh:mm and include time',
    },
    {
      name: 'invalid coordinates',
      input: [{ ...event, coordinates: { lat: 91, lng: 38 } }],
      message: 'events[].coordinates.lat must be between -90 and 90',
    },
    {
      name: 'blank performer',
      input: [{ ...event, performer: ['   '] }],
      message: 'events[].performer[] must not be blank',
    },
  ])('rejects $name', ({ input, message }) => {
    expect(validationIssues(input).map((issue) => issue.message)).toEqual([
      message,
    ]);
  });

  it('rejects an event that does not end after it starts', () => {
    expect(
      validationIssues([
        {
          ...event,
          ends_at: '31.05.2026 19:00',
        },
      ]),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "events[].ends_at must be later than events[].starts_at",
          "path": [
            0,
            "ends_at",
          ],
        },
      ]
    `);
  });

  it('requires unique explicit slugs for multiple events', () => {
    expect(
      validationIssues([
        event,
        { ...event, slug: 'meeting' },
        { ...event, slug: 'meeting' },
      ]),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "events[].slug is required when article has multiple events",
          "path": [
            0,
            "slug",
          ],
        },
        {
          "message": "duplicate event slug \"meeting\"",
          "path": [
            2,
            "slug",
          ],
        },
      ]
    `);
  });
});
