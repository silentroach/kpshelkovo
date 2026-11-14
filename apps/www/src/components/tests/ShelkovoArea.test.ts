/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { AREAS, formatShortArea } from '@/lib/areas';
import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import ShelkovoArea from '../ShelkovoArea.astro';

const windows: Window[] = [];
afterEach(async () => {
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

describe('ShelkovoArea', () => {
  it('separates its name from adjacent metadata in extracted text', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ShelkovoArea, { props: { area: 'forest' } });
    const window = new Window();
    windows.push(window);
    window.document.body.innerHTML = `<p>7 ноября${html}источник</p>`;

    expect(window.document.querySelector('p')?.textContent).toBe('7 ноября Форест источник');
  });

  it.each(AREAS)(
    'renders %s as one visible name and a decorative icon, without an action',
    async (area) => {
      const container = await createAstroContainer();
      const html = await container.renderToString(ShelkovoArea, { props: { area } });
      const window = new Window();
      windows.push(window);
      const document = window.document;
      document.body.innerHTML = html;
      const pair = document.querySelector('.shelkovo-area');

      expect(pair?.textContent.trim()).toBe(formatShortArea(area));
      expect({
        decorativeIcons: pair?.querySelectorAll('svg[aria-hidden="true"]').length,
        labels: pair?.querySelectorAll('span').length,
        redundantNamesOrActions: document.querySelectorAll(
          '[title], [aria-label], [role], [tabindex], [data-pagefind-index-attrs], a, button, input, script'
        ).length
      }).toMatchInlineSnapshot(`
      {
        "decorativeIcons": 1,
        "labels": 1,
        "redundantNamesOrActions": 0,
      }
    `);
    }
  );
});
