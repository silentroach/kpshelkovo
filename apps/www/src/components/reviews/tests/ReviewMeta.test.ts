/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import ReviewMeta from '../ReviewMeta.astro';

describe('ReviewMeta', () => {
  it.each([
    { authorFirst: false, author: 'Имя автора', expected: ['TIME', 'SPAN', 'SPAN'] },
    { authorFirst: true, author: 'Имя автора', expected: ['SPAN', 'TIME', 'SPAN'] },
    { authorFirst: true, author: undefined, expected: ['SPAN', 'TIME', 'SPAN'] }
  ])(
    'renders authorFirst=$authorFirst with author=$author in DOM order',
    async ({ authorFirst, author, expected }) => {
      const container = await createAstroContainer();
      const html = await container.renderToString(ReviewMeta, {
        props: {
          review: { author, area: 'forest', publishedIso: '2026-06-25' },
          authorFirst
        }
      });
      const document = new Window().document;
      document.body.innerHTML = html;
      const children = [...(document.querySelector('div')?.children ?? [])];

      expect(children.map((child) => child.tagName)).toEqual(expected);
      expect(children[authorFirst ? 0 : 1]?.textContent).toBe(author ?? 'Анонимный собственник');
      expect(document.querySelector('time')?.getAttribute('datetime')).toBe('2026-06-25');
      expect(document.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
        'Шелково Форест'
      );
    }
  );

  it('keeps date first and the verified attribution when no order is requested', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ReviewMeta, {
      props: {
        review: { area: 'forest', publishedIso: '2026-06-25' },
        showVerified: true
      }
    });
    const document = new Window().document;
    document.body.innerHTML = html;

    expect(document.querySelector('div')?.firstElementChild?.tagName).toBe('TIME');
    expect(document.body.textContent).toContain('Анонимный собственник');
    expect(document.body.textContent).toContain('проверенный собственник');
  });
});
