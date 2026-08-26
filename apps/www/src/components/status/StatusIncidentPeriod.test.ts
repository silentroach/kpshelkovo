/// <reference types="astro/client" />

import { dateTimeFromISO } from '@shelkovo/format';
import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import StatusIncidentPeriod from './StatusIncidentPeriod.astro';

const NBSP = '\u00A0';
const currentYear = dateTimeFromISO(new Date().toISOString()).year;

describe('StatusIncidentPeriod', () => {
  it('renders same-day time ranges without extra whitespace before the end time', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusIncidentPeriod, {
      props: {
        incident: {
          phase: 'resolved',
          started: {
            at: new Date(`${currentYear}-05-01T07:32:00+03:00`),
            iso: `${currentYear}-05-01T07:32:00+03:00`,
            hasTime: true,
          },
          ended: {
            at: new Date(`${currentYear}-05-01T16:38:00+03:00`),
            iso: `${currentYear}-05-01T16:38:00+03:00`,
            hasTime: true,
          },
          duration: { totalMinutes: 9 * 60 + 6 },
        },
      },
    });

    expect(html).toMatch(
      new RegExp(
        `<span[^>]*><time[^>]*>1${NBSP}мая, 07:32</time> -${NBSP}<time[^>]*>16:38</time> \\(9${NBSP}ч\\. 6${NBSP}мин\\.\\)</span>`,
      ),
    );
    expect(html).not.toMatch(/>\s+16:38</u);
  });
});
