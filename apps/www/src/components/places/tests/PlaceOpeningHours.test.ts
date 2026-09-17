/// <reference types="astro/client" />
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { formatPlaceOpeningHours } from '@/lib/places/opening-hours';
import type { PlaceOpeningHours } from '@/lib/places/types';
import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import PlaceOpeningHoursComponent from '../PlaceOpeningHours.astro';

describe('PlaceOpeningHours HTML', () => {
  it.each([undefined, 'Вход со двора.'])(
    'renders the full schedule before JS with optional note: %s',
    async (description) => {
      const openingHours: PlaceOpeningHours = {
        description,
        periods: [
          { days: ['mon', 'wed', 'thu', 'fri', 'sat', 'sun'], opensAt: '14:00', closesAt: '18:00' },
          { days: ['mon', 'wed', 'thu', 'fri', 'sat', 'sun'], opensAt: '09:00', closesAt: '13:00' }
        ]
      };
      const container = await createAstroContainer();
      const html = await container.renderToString(PlaceOpeningHoursComponent, {
        props: { openingHours }
      });
      const window = new Window();
      try {
        const document = window.document;
        document.body.innerHTML = html;
        const rows = [...document.querySelectorAll('li')];
        expect(
          rows.map((row) => ({
            days: row.children[0]?.textContent?.replace(/:$/u, ''),
            hours: row.children[1]?.textContent,
            closed: row.dataset.closed === 'true'
          }))
        ).toEqual(formatPlaceOpeningHours(openingHours));
        expect(document.querySelector('ul')?.closest('[hidden], details')).toBeNull();
        const status = document.querySelector('[data-place-opening-status]');
        expect(status?.hasAttribute('hidden')).toBe(true);
        expect(status?.textContent).toBe('');
        const note = document.querySelector('ul + p');
        expect(note?.textContent.replaceAll('\u00a0', ' ')).toBe(description);
        expect(document.querySelectorAll('p')).toHaveLength(description ? 1 : 0);
      } finally {
        await window.close();
      }
    }
  );

  it('omits the hours block and status without a schedule', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(PlaceOpeningHoursComponent);
    expect(html).not.toMatch(
      /<dt|<dd|<ul|<place-opening-hours|data-place-opening-status|Время работы|неизвестно/iu
    );
  });
});
