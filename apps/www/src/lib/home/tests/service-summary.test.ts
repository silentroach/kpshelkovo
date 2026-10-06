import { describe, expect, it } from 'vitest';

import {
  getHomeServiceMessages,
  getHomeServiceWindows,
  parseHomeServiceWindows
} from '@/lib/home/service-summary';
import type {
  HomeServiceIncident,
  HomeServiceWindowsPayload
} from '@/lib/home/service-summary.types';
import {
  STATUS_KINDS,
  STATUS_SERVICES,
  type StatusKind,
  type StatusService
} from '@/lib/status/schema';

const START = Date.parse('2026-10-08T10:00:00+03:00');
const END = Date.parse('2026-10-08T13:00:00+03:00');

const incident = (
  service: StatusService,
  kind: StatusKind,
  start: number,
  end?: number
): HomeServiceIncident => ({
  service,
  kind,
  started: { at: new Date(start), iso: new Date(start).toISOString(), hasTime: true },
  ended:
    end === undefined
      ? undefined
      : { at: new Date(end), iso: new Date(end).toISOString(), hasTime: true }
});

describe('getHomeServiceWindows', () => {
  it('groups minimal unfinished windows in service order', () => {
    const source = {
      ...incident('water', 'maintenance', 30),
      title: 'Подробности работ',
      sourceUrl: 'https://example.com/source'
    };
    const payload = getHomeServiceWindows(
      [
        incident('dam', 'incident', 5, 10),
        source,
        incident('electricity', 'incident', 5, 20),
        incident('internet', 'incident', 40)
      ],
      10
    );

    expect(payload).toMatchInlineSnapshot(`
      [
        {
          "service": "electricity",
          "windows": [
            {
              "end": 20,
              "kind": "incident",
              "start": 5,
            },
          ],
        },
        {
          "service": "water",
          "windows": [
            {
              "end": undefined,
              "kind": "maintenance",
              "start": 30,
            },
          ],
        },
        {
          "service": "internet",
          "windows": [
            {
              "end": undefined,
              "kind": "incident",
              "start": 40,
            },
          ],
        },
      ]
    `);
    expect(parseHomeServiceWindows(JSON.stringify(payload))).toEqual(payload);
  });

  it.each(STATUS_KINDS)('keeps unresolved %s windows at the exact build boundaries', (kind) => {
    const input = [incident('dam', kind, START, END)];

    expect(
      [START - 1, START, END - 1, END, END + 1].map(
        (now) => getHomeServiceWindows(input, now).length
      )
    ).toEqual([1, 1, 1, 0, 0]);
  });

  it('keeps a future open window without a time horizon', () => {
    const start = Date.parse('2099-10-08T10:00:00+03:00');
    const payload = getHomeServiceWindows([incident('water', 'incident', start)], START);

    expect(payload[0]?.windows[0]?.start).toBe(start);
    expect(getHomeServiceMessages(payload, start)[0]?.phase).toBe('active');
  });

  it('returns an empty payload for empty or completed histories', () => {
    expect(getHomeServiceWindows([], START)).toEqual([]);
    expect(getHomeServiceWindows([incident('water', 'incident', START, END)], END)).toEqual([]);
  });
});

describe('getHomeServiceMessages', () => {
  it('shows one message per service, preferring an active incident, then work, then the future', () => {
    const payload: HomeServiceWindowsPayload = [
      {
        service: 'water',
        windows: [
          { kind: 'maintenance', start: START - 2, end: END + 1 },
          { kind: 'maintenance', start: END + 2 },
          { kind: 'incident', start: START - 1, end: END },
          { kind: 'incident', start: START, end: END }
        ]
      }
    ];

    expect(
      [START, END, END + 1].map((now) =>
        getHomeServiceMessages(payload, now).map((message) => [
          message.phase,
          message.kind,
          message.label
        ])
      )
    ).toMatchInlineSnapshot(`
      [
        [
          [
            "active",
            "incident",
            "Перебой",
          ],
        ],
        [
          [
            "active",
            "maintenance",
            "Идут работы",
          ],
        ],
        [
          [
            "scheduled",
            "maintenance",
            "Работы с 8 октября",
          ],
        ],
      ]
    `);
  });

  it.each([false, true])(
    'selects the nearest future window, with an incident winning a tie (reverse: %s)',
    (reverse) => {
      const windows = [
        { kind: 'incident' as const, start: END + 1 },
        { kind: 'maintenance' as const, start: START },
        { kind: 'incident' as const, start: START, end: END }
      ];
      const payload: HomeServiceWindowsPayload = [
        { service: 'dam', windows: reverse ? windows.toReversed() : windows }
      ];

      expect(getHomeServiceMessages(payload, START - 1)).toMatchInlineSnapshot(`
        [
          {
            "kind": "incident",
            "label": "Перебой с 8 октября",
            "phase": "scheduled",
            "service": "dam",
            "start": 1791442800000,
          },
        ]
      `);
      expect(
        getHomeServiceMessages([{ service: 'dam', windows: windows.slice(0, 2) }], START - 1)[0]
          ?.kind
      ).toBe('maintenance');
    }
  );

  it('orders active incidents before active work, then future starts', () => {
    const payload: HomeServiceWindowsPayload = [
      { service: 'internet', windows: [{ kind: 'incident', start: END + 1 }] },
      { service: 'electricity', windows: [{ kind: 'maintenance', start: START }] },
      { service: 'dam', windows: [{ kind: 'maintenance', start: END }] },
      { service: 'water', windows: [{ kind: 'incident', start: START }] }
    ];

    expect(getHomeServiceMessages(payload, START).map((message) => message.service)).toEqual([
      'water',
      'electricity',
      'dam',
      'internet'
    ]);
  });

  it.each(STATUS_KINDS)(
    'uses service order for equally ranked active %s messages regardless of start',
    (kind) => {
      const payload = STATUS_SERVICES.toReversed().map((service, index) => ({
        service,
        windows: [{ kind, start: START - index }]
      }));

      expect(getHomeServiceMessages(payload, START).map((message) => message.service)).toEqual(
        STATUS_SERVICES
      );
    }
  );

  it('uses service order for simultaneous future messages regardless of kind', () => {
    const payload: HomeServiceWindowsPayload = [
      { service: 'dam', windows: [{ kind: 'incident', start: START }] },
      { service: 'internet', windows: [{ kind: 'maintenance', start: START }] },
      { service: 'water', windows: [{ kind: 'incident', start: START }] },
      { service: 'electricity', windows: [{ kind: 'maintenance', start: START }] }
    ];

    expect(getHomeServiceMessages(payload, START - 1).map((message) => message.service)).toEqual(
      STATUS_SERVICES
    );
  });

  it.each(STATUS_KINDS)('recalculates %s at exact start and end boundaries', (kind) => {
    const payload = getHomeServiceWindows([incident('water', kind, START, END)], START - 1);

    expect(
      [START - 1, START, END - 1, END, END + 1].map((now) =>
        getHomeServiceMessages(payload, now).map((message) => message.phase)
      )
    ).toEqual([['scheduled'], ['active'], ['active'], [], []]);
  });

  it.each(STATUS_KINDS)('keeps an open %s active from its exact start onward', (kind) => {
    const payload = getHomeServiceWindows([incident('water', kind, START)], START - 1);

    expect(
      [START - 1, START, END].map((now) => getHomeServiceMessages(payload, now)[0]?.phase)
    ).toEqual(['scheduled', 'active', 'active']);
  });

  it('skips zero-length windows at their start and selects the next event after an end', () => {
    const payload = getHomeServiceWindows(
      [incident('water', 'maintenance', START, START), incident('water', 'incident', END, END + 1)],
      START - 1
    );

    expect(getHomeServiceMessages(payload, START)[0]?.start).toBe(END);
    expect(getHomeServiceMessages(payload, END + 1)).toEqual([]);
  });

  it('returns no messages for an empty history', () => {
    expect(getHomeServiceMessages([], START)).toEqual([]);
  });

  it.each([
    ['2026-10-08T00:00:00+03:00', '8 октября'],
    ['2026-10-07T20:59:59.999Z', '7 октября'],
    ['2026-10-07T21:00:00.000Z', '8 октября'],
    ['2026-12-31T20:59:59.999Z', '31 декабря'],
    ['2026-12-31T21:00:00.000Z', '1 января 2027'],
    ['2027-01-01T00:30:00+14:00', '31 декабря'],
    ['2026-12-31T23:30:00-04:00', '1 января 2027']
  ])(
    'formats the Moscow day and year of %s without time or nonbreaking spaces',
    (iso, expected) => {
      const payload: HomeServiceWindowsPayload = [
        { service: 'dam', windows: [{ kind: 'maintenance', start: Date.parse(iso) }] }
      ];

      expect(
        getHomeServiceMessages(payload, Date.parse('2026-01-01T00:00:00+03:00'))[0]?.label
      ).toBe(`Работы с ${expected}`);
    }
  );

  it('refreshes the Moscow year on every calculation using nowMs, without reimporting', () => {
    const payload: HomeServiceWindowsPayload = [
      {
        service: 'dam',
        windows: [{ kind: 'maintenance', start: Date.parse('2032-01-01T00:30:00+03:00') }]
      }
    ];

    expect(
      ['2031-12-31T20:59:59.999Z', '2031-12-31T21:00:00.000Z'].map(
        (now) => getHomeServiceMessages(payload, Date.parse(now))[0]?.label
      )
    ).toMatchInlineSnapshot(`
      [
        "Работы с 1 января 2032",
        "Работы с 1 января",
      ]
    `);
  });
});

describe('parseHomeServiceWindows', () => {
  it.each([undefined, '', '{'])('safely rejects missing or malformed JSON: %s', (value) => {
    expect(parseHomeServiceWindows(value)).toBeUndefined();
  });

  it('accepts an empty payload, epoch zero, negative timestamps and zero-length windows', () => {
    const payload = [
      {
        service: 'water',
        windows: [
          { kind: 'incident', start: -1, end: 0 },
          { kind: 'maintenance', start: 0, end: 0 }
        ]
      }
    ];

    expect(parseHomeServiceWindows('[]')).toEqual([]);
    expect(parseHomeServiceWindows(JSON.stringify(payload))).toEqual(payload);
  });
});
