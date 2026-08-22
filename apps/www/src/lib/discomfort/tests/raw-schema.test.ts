import { describe, expect, it } from 'vitest';

import { RawDiscomfortEventSchema } from '../raw-schema';

describe('RawDiscomfortEventSchema', () => {
  it('normalizes a valid event frontmatter', () => {
    expect(
      RawDiscomfortEventSchema.parse({
        date: new Date('2026-08-20T00:00:00.000Z'),
        title: '  Обычные гостевые пропуска стали недоступны  ',
      }),
    ).toMatchInlineSnapshot(`
      {
        "date": "2026-08-20",
        "title": "Обычные гостевые пропуска стали недоступны",
      }
    `);
  });

  it.each([
    { date: '2026-02-30', title: 'Событие' },
    { date: '20.08.2026', title: 'Событие' },
    { date: '2026-08-20', title: '   ' },
  ])('rejects invalid event frontmatter', (event) => {
    expect(RawDiscomfortEventSchema.safeParse(event).success).toBe(false);
  });

  it('rejects updated_at earlier than the event date', () => {
    expect(() =>
      RawDiscomfortEventSchema.parse({
        date: '2026-08-20',
        updated_at: '2026-08-19',
        title: 'Событие',
      }),
    ).toThrowErrorMatchingInlineSnapshot(
      `
      [ZodError: [
        {
          "code": "custom",
          "message": "updated_at cannot be earlier than date",
          "path": [
            "updated_at"
          ]
        }
      ]]
    `,
    );
  });
});
