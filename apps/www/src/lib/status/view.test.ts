import { describe, expect, it } from 'vitest';
import { dateTimeFromISO } from '@shelkovo/format';

import { visibleWhitespace } from '../test/visible-whitespace';

import {
  buildStatusTimelineTooltipData,
  buildStatusTimelineTooltipListItemData,
  formatStatusDate,
  formatStatusIncidentPeriodText,
  formatStatusTimelineGroupTitle,
  formatStatusTimelineTooltipLabel,
  getStatusIncidentPeriod,
} from './view';
import { formatStatusTimelineTooltipGroupLabel } from './timeline-tooltip';

const NBSP = '\u00A0';
const currentYear = dateTimeFromISO(new Date().toISOString()).year;
const nextYear = currentYear + 1;

const period = (input: {
  readonly isActive: boolean;
  readonly startedIso: string;
  readonly startedHasTime: boolean;
  readonly endedIso?: string;
  readonly endedHasTime: boolean;
  readonly duration?: { readonly totalMinutes: number };
}) => ({
  phase: input.isActive ? ('active' as const) : ('resolved' as const),
  started: {
    iso: input.startedIso,
    hasTime: input.startedHasTime,
  },
  ended: input.endedIso
    ? {
        iso: input.endedIso,
        hasTime: input.endedHasTime,
      }
    : undefined,
  duration: input.duration,
});

describe('getStatusIncidentPeriod', () => {
  it('shows start label when there is no end date', () => {
    expect(
      getStatusIncidentPeriod(
        period({
          isActive: false,
          startedIso: `${currentYear}-05-01T07:32:00+03:00`,
          startedHasTime: true,
          endedHasTime: false,
        }),
      ),
    ).toEqual({
      prefix: 'Начало',
      start: {
        iso: `${currentYear}-05-01T07:32:00+03:00`,
        text: '1 мая, 07:32',
      },
    });
  });

  it('shows since label for active entries without end date', () => {
    expect(
      getStatusIncidentPeriod(
        period({
          isActive: true,
          startedIso: `${currentYear}-05-01T07:32:00+03:00`,
          startedHasTime: true,
          endedHasTime: false,
        }),
      ),
    ).toEqual({
      prefix: 'Начиная с',
      start: {
        iso: `${currentYear}-05-01T07:32:00+03:00`,
        text: '1 мая, 07:32',
      },
    });
  });

  it('shows full date range without labels when both dates are present', () => {
    expect(
      getStatusIncidentPeriod(
        period({
          isActive: false,
          startedIso: `${currentYear}-05-01T00:00:00+03:00`,
          startedHasTime: false,
          endedIso: `${currentYear}-05-02T00:00:00+03:00`,
          endedHasTime: false,
          duration: { totalMinutes: 24 * 60 },
        }),
      ),
    ).toEqual({
      start: {
        iso: `${currentYear}-05-01T00:00:00+03:00`,
        text: '1 мая',
      },
      end: {
        iso: `${currentYear}-05-02T00:00:00+03:00`,
        text: '2 мая',
      },
      duration: '1 дн.',
    });
  });

  it('compresses same-day ranges with time into one date and two times', () => {
    expect(
      getStatusIncidentPeriod(
        period({
          isActive: false,
          startedIso: `${currentYear}-05-01T07:32:00+03:00`,
          startedHasTime: true,
          endedIso: `${currentYear}-05-01T16:38:00+03:00`,
          endedHasTime: true,
          duration: { totalMinutes: 9 * 60 + 6 },
        }),
      ),
    ).toEqual({
      start: {
        iso: `${currentYear}-05-01T07:32:00+03:00`,
        text: '1 мая, 07:32',
      },
      end: {
        iso: `${currentYear}-05-01T16:38:00+03:00`,
        text: '16:38',
      },
      duration: '9 ч. 6 мин.',
    });
  });

  it('shows one date without duration for same-day ranges without time', () => {
    expect(
      getStatusIncidentPeriod(
        period({
          isActive: false,
          startedIso: `${currentYear}-05-01T00:00:00+03:00`,
          startedHasTime: false,
          endedIso: `${currentYear}-05-01T00:00:00+03:00`,
          endedHasTime: false,
          duration: { totalMinutes: 0 },
        }),
      ),
    ).toEqual({
      start: {
        iso: `${currentYear}-05-01T00:00:00+03:00`,
        text: '1 мая',
      },
    });
  });

  it('keeps the full end timestamp when only one side has time', () => {
    expect(
      getStatusIncidentPeriod(
        period({
          isActive: false,
          startedIso: `${currentYear}-05-01T00:00:00+03:00`,
          startedHasTime: false,
          endedIso: `${currentYear}-05-01T16:38:00+03:00`,
          endedHasTime: true,
          duration: { totalMinutes: 16 * 60 + 38 },
        }),
      ),
    ).toEqual({
      start: {
        iso: `${currentYear}-05-01T00:00:00+03:00`,
        text: '1 мая',
      },
      end: {
        iso: `${currentYear}-05-01T16:38:00+03:00`,
        text: '1 мая, 16:38',
      },
      duration: '16 ч. 38 мин.',
    });
  });
});

describe('formatStatusDate', () => {
  it('keeps year for non-current years', () => {
    expect(
      formatStatusDate(`${nextYear}-05-01T07:32:00+03:00`, {
        hasTime: true,
      }),
    ).toBe(`1 мая ${nextYear}, 07:32`);
  });

  it('supports non-breaking spaces for UI dates', () => {
    expect(
      formatStatusDate(`${nextYear}-05-01T07:32:00+03:00`, {
        hasTime: true,
        nonBreaking: true,
      }),
    ).toBe(`1${NBSP}мая${NBSP}${nextYear}, 07:32`);
  });
});

describe('formatStatusIncidentPeriodText', () => {
  it('uses the same active wording as meta and timeline', () => {
    expect(
      formatStatusIncidentPeriodText(
        period({
          isActive: true,
          startedIso: `${currentYear}-05-01T07:32:00+03:00`,
          startedHasTime: true,
          endedHasTime: false,
        }),
      ),
    ).toBe('Начиная с 1 мая, 07:32');
  });

  it('supports non-breaking spaces for UI period labels', () => {
    expect(
      formatStatusIncidentPeriodText(
        period({
          isActive: false,
          startedIso: `${currentYear}-05-01T07:32:00+03:00`,
          startedHasTime: true,
          endedIso: `${currentYear}-05-01T16:38:00+03:00`,
          endedHasTime: true,
          duration: { totalMinutes: 9 * 60 + 6 },
        }),
        { nonBreaking: true },
      ),
    ).toBe(`1${NBSP}мая, 07:32 -${NBSP}16:38 (9${NBSP}ч. 6${NBSP}мин.)`);
  });
});

describe('buildStatusTimelineTooltipData', () => {
  it('builds timeline tooltip labels for an active incident', () => {
    const tooltip = buildStatusTimelineTooltipData({
      service: 'water',
      incident: {
        kind: 'incident',
        title: 'Нет воды на Центральной',
        phase: 'active',
        startedIso: `${currentYear}-05-01T07:32:00+03:00`,
        startedHasTime: true,
        endedHasTime: false,
      },
    });

    expect(visibleWhitespace(tooltip)).toMatchInlineSnapshot(`
      {
        "kindLabel": "Инцидент",
        "periodLabel": "Начиная с·1·мая, 07:32",
        "phaseLabel": "идет",
        "serviceLabel": "Вода",
        "title": "Нет воды на·Центральной",
      }
    `);
    expect(
      visibleWhitespace(formatStatusTimelineTooltipLabel(tooltip)),
    ).toMatchInlineSnapshot(
      `"Вода. Инцидент. Нет воды на·Центральной. Статус: идет. Начиная с·1·мая, 07:32"`,
    );
  });

  it('builds timeline tooltip labels for planned maintenance', () => {
    expect(
      visibleWhitespace(
        buildStatusTimelineTooltipData({
          service: 'electricity',
          incident: {
            kind: 'maintenance',
            title: 'Плановая профилактика сети',
            phase: 'scheduled',
            startedIso: `${currentYear}-05-03T00:00:00+03:00`,
            startedHasTime: false,
            endedHasTime: false,
          },
        }),
      ),
    ).toMatchInlineSnapshot(`
      {
        "kindLabel": "Плановые работы",
        "periodLabel": "Начало 3·мая",
        "phaseLabel": "запланировано",
        "serviceLabel": "Электричество",
        "title": "Плановая профилактика сети",
      }
    `);
  });

  it('keeps future maintenance with an end date in planned phase', () => {
    expect(
      buildStatusTimelineTooltipData({
        service: 'electricity',
        incident: {
          kind: 'maintenance',
          title: 'Плановая профилактика сети',
          phase: 'scheduled',
          startedIso: `${nextYear}-05-03T00:00:00+03:00`,
          startedHasTime: false,
          endedIso: `${nextYear}-05-04T00:00:00+03:00`,
          endedHasTime: false,
        },
      }),
    ).toEqual({
      serviceLabel: 'Электричество',
      kindLabel: 'Плановые работы',
      title: 'Плановая профилактика сети',
      phaseLabel: 'запланировано',
      periodLabel: `3${NBSP}мая ${nextYear}${NBSP}— 4${NBSP}мая ${nextYear}`,
    });
  });

  it('can emit non-breaking spaces for timeline UI labels', () => {
    const tooltip = buildStatusTimelineTooltipData({
      service: 'water',
      incident: {
        kind: 'incident',
        title: 'Нет воды на Центральной',
        phase: 'active',
        startedIso: `${currentYear}-05-01T07:32:00+03:00`,
        startedHasTime: true,
        endedHasTime: false,
      },
      nonBreaking: true,
    });

    expect(tooltip.periodLabel).toBe(`Начиная с${NBSP}1${NBSP}мая, 07:32`);
    expect(
      visibleWhitespace(formatStatusTimelineTooltipLabel(tooltip)),
    ).toMatchInlineSnapshot(
      `"Вода. Инцидент. Нет воды на·Центральной. Статус: идет. Начиная с·1·мая, 07:32"`,
    );
  });
});

describe('grouped timeline tooltip text', () => {
  it('builds a compact day group title', () => {
    expect(
      visibleWhitespace(
        formatStatusTimelineGroupTitle({
          count: 3,
          startedIso: `${currentYear}-05-09T07:32:00+03:00`,
        }),
      ),
    ).toMatchInlineSnapshot(`"3 события за·9·мая"`);
  });

  it('formats grouped tooltip list items and summary labels', () => {
    const items = [
      buildStatusTimelineTooltipListItemData({
        kind: 'incident',
        title: 'Отключение 1',
        phase: 'resolved',
        startedIso: `${currentYear}-05-09T07:32:00+03:00`,
        startedHasTime: true,
        endedIso: `${currentYear}-05-09T08:10:00+03:00`,
        endedHasTime: true,
        duration: {
          totalMinutes: 38,
        },
      }),
      buildStatusTimelineTooltipListItemData({
        kind: 'incident',
        title: 'Отключение 2',
        phase: 'active',
        startedIso: `${currentYear}-05-09T12:15:00+03:00`,
        startedHasTime: true,
        endedHasTime: false,
      }),
    ];

    expect(visibleWhitespace(items[0])).toMatchInlineSnapshot(`
      {
        "periodLabel": "9·мая, 07:32·— 08:10 (38 мин.)",
        "phaseIcon": "check",
        "title": "Отключение·1",
      }
    `);
    expect(
      visibleWhitespace(
        formatStatusTimelineTooltipGroupLabel({
          serviceLabel: 'Электричество',
          title: '2 события за 9 мая',
          items,
        }),
      ),
    ).toMatchInlineSnapshot(
      `"Электричество. 2 события за 9 мая. Отключение·1. 9·мая, 07:32·— 08:10 (38 мин.). Отключение·2. Начиная с·9·мая, 12:15"`,
    );
  });
});
