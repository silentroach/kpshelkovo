/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import NewsMeta from '../NewsMeta.astro';

const windows: Window[] = [];
afterEach(async () => {
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

describe('NewsMeta areas', () => {
  it.each([false, true])(
    'preserves area order with appliesToAllAreas=%s',
    async (appliesToAllAreas) => {
      const container = await createAstroContainer();
      const html = await container.renderToString(NewsMeta, {
        props: {
          publishedIso: '2026-11-14',
          areas: ['park', 'river', 'forest', 'village'],
          appliesToAllAreas,
          sourceUrl: 'https://example.com/source'
        }
      });
      const window = new Window();
      windows.push(window);
      window.document.body.innerHTML = html;
      const document = window.document;
      expect(
        [...document.querySelectorAll('.shelkovo-area')].map((pair) => pair.textContent.trim())
      ).toEqual(appliesToAllAreas ? [] : ['Парк', 'Ривер', 'Форест', 'Вилладж']);
      expect(document.querySelector('.news-meta')?.firstElementChild?.tagName).toBe('TIME');
      expect(document.querySelector('.news-meta')?.lastElementChild?.getAttribute('href')).toBe(
        'https://example.com/source'
      );
    }
  );
});
