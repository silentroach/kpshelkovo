/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import { createPersonMentionTarget } from '@/lib/people/mentions';

import { buildDiscomfortDataset } from '../load';

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import DiscomfortPage from '@/pages/815/discomfort/index.astro';

describe('/815/discomfort/', () => {
  it('renders the quote and timeline as one searchable static document', async () => {
    const container = await createAstroContainer();
    const data = buildDiscomfortDataset(
      [
        {
          id: 'guest-passes-disputed-debt',
          body: 'Третий пункт со [ссылкой](/news/third/).',
          data: { date: '2026-08-20', title: 'Гостевые пропуска' },
        },
        {
          id: 'bills-at-815',
          body: 'Первый пункт со [ссылкой](/news/first/).',
          data: { date: '2026-04-29', title: 'Счета по 815 ₽' },
        },
        {
          id: 'meeting-recording-ban',
          body: 'Второй пункт со [ссылкой](/news/second/).',
          data: { date: '2026-06-13', title: 'Запрет записи' },
        },
      ],
      {
        mentionRegistry: new Map([
          [
            'ykizilov',
            createPersonMentionTarget(
              'ykizilov',
              'Юрий Кизилов',
              undefined,
              'ОК "Комфорт"',
              'Руководитель',
            ),
          ],
        ]),
      },
    );
    const html = await container.renderToString(DiscomfortPage, {
      request: new Request('https://example.com/815/discomfort/'),
      props: { data },
    });

    expect(html).toContain('<h1 class="ui-page-title">ОК Дискомфорт</h1>');
    expect(html).toContain('<ol class="list-none" role="list">');
    expect(html).toContain('datetime="2026-04-29"');
    expect(html).toContain('id="bills-at-815"');
    expect(html).toContain('id="meeting-recording-ban"');
    expect(html).toContain('id="guest-passes-disputed-debt"');
    expect(html.indexOf('id="bills-at-815"')).toBeLessThan(
      html.indexOf('id="guest-passes-disputed-debt"'),
    );
    expect(
      [...html.matchAll(/href="\/815\/discomfort\/#[^"]+"/g)].map(
        ([href]) => href,
      ),
    ).toMatchInlineSnapshot(`
      [
        "href=\"/815/discomfort/#bills-at-815\"",
        "href=\"/815/discomfort/#meeting-recording-ban\"",
        "href=\"/815/discomfort/#guest-passes-disputed-debt\"",
      ]
    `);
    expect(html).toContain('href="/meetings/2026-02-21-ok/#t-01-39-30"');
    expect(html).toContain('title="Руководитель, ОК &quot;Комфорт&quot;"');
    expect(html).toContain('data-pagefind-body');
    expect(html).toContain(
      '<link rel="alternate" type="text/markdown" href="https://kpshelkovo.online/815/discomfort/index.md">',
    );
  });
});
