/// <reference types="astro/client" />

import { within } from '@testing-library/svelte';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import { buildReglamentPayload } from '@/lib/reglament/discovery';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import RegulationPage from '@/pages/815/regulation/index.astro';
import { createAstroContainer } from '@/test/astro-container';

describe('regulation calculator checkbox accessibility', () => {
  it('names every server-rendered checkbox by its visible row heading without a repeated description', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(RegulationPage, {
      request: new Request('https://example.com/815/regulation/')
    });
    const window = new Window();

    try {
      window.document.write(html);
      const page = within(window.document.body as typeof window.document.body & HTMLElement);
      const rows = buildReglamentPayload(estimate2026).sections.flatMap((section) =>
        section.rows.filter((row) =>
          row.editable_fields.some((field) => field.key === 'enabled' && field.level === 'basic')
        )
      );

      expect(page.getAllByRole('checkbox')).toHaveLength(rows.length);

      for (const row of rows) {
        const heading = window.document.getElementById(`reglament-row-title-${row.id}`);
        if (!heading) {
          throw new Error(`Missing heading for estimate row ${row.id}`);
        }
        const name = heading.textContent.replace(/\s+/gu, ' ').trim();
        expect(page.getByRole('heading', { level: 4, name })).toBe(heading);

        const checkbox = page.getByRole('checkbox', {
          name,
          description: '',
          checked: row.baseline.is_enabled
        });

        expect(checkbox).toBeInstanceOf(window.HTMLInputElement);
        expect(checkbox.getAttribute('data-reglament-row-id')).toBe(row.id);
      }
    } finally {
      await window.happyDOM.close();
    }
  });
});
