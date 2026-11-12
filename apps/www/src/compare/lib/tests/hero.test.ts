/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { expect, test } from 'vitest';

// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import Hero from '@/compare/components/Hero.astro';
import { createAstroContainer } from '@/test/astro-container';

test('composes a single heading, subtitle link and independent evidence content', async () => {
  const container = await createAstroContainer();
  const html = await container.renderToString(Hero, {
    props: { title: 'Сравнение тарифов' },
    slots: {
      subtitle: '<p>Сравнение по цене и <a href="/815/compare/rating/">рейтингу</a></p>',
      default: '<section aria-label="Сводка"><p>Стоимость обслуживания</p></section>'
    }
  });
  const window = new Window();
  try {
    window.document.body.innerHTML = html;
    const { document } = window;
    expect({
      headings: document.querySelectorAll('h1').length,
      title: document.querySelector('h1')?.textContent,
      subtitle: document.querySelector('.page-heading-subtitle')?.textContent,
      link: document.querySelector('.page-heading-subtitle a')?.getAttribute('href'),
      evidenceInHeading: !!document.querySelector('.page-heading section'),
      evidence: document.querySelector('section[aria-label="Сводка"]')?.textContent
    }).toMatchInlineSnapshot(`
      {
        "evidence": "Стоимость обслуживания",
        "evidenceInHeading": false,
        "headings": 1,
        "link": "/815/compare/rating/",
        "subtitle": "Сравнение по цене и рейтингу",
        "title": "Сравнение тарифов",
      }
    `);
  } finally {
    await window.happyDOM.close();
  }
});
