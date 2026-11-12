/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

import type { ContactVcfLinkProps } from '../../contacts/contact-vcf-link.types';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import ContactVcfLink from '../../contacts/ContactVcfLink.astro';
import type {
  HeadingActionAddToCalendarProps,
  HeadingActionLinkProps
} from '../heading-actions.types';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import HeadingActionAddToCalendar from '../HeadingActionAddToCalendar.astro';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import HeadingActionContactReviews from '../HeadingActionContactReviews.astro';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import HeadingActionMap from '../HeadingActionMap.astro';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import HeadingActionSiteMap from '../HeadingActionSiteMap.astro';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import HeadingActionStatusCalendar from '../HeadingActionStatusCalendar.astro';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import HeadingActionTelegram from '../HeadingActionTelegram.astro';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import HeadingActionWebsite from '../HeadingActionWebsite.astro';

const windows: Window[] = [];
afterEach(async () => {
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

describe('heading action wrappers', () => {
  it.each([
    {
      name: 'website',
      component: HeadingActionWebsite,
      props: { href: 'https://example.com/' } satisfies HeadingActionLinkProps
    },
    {
      name: 'Telegram',
      component: HeadingActionTelegram,
      props: { href: 'https://t.me/example' } satisfies HeadingActionLinkProps
    },
    {
      name: 'external map',
      component: HeadingActionMap,
      props: { href: 'https://yandex.ru/maps/?pt=37,55' } satisfies HeadingActionLinkProps
    },
    {
      name: 'site map',
      component: HeadingActionSiteMap,
      props: { href: '/map/?h=club' } satisfies HeadingActionLinkProps
    },
    {
      name: 'contact reviews',
      component: HeadingActionContactReviews,
      props: { href: '/sarafan/food/example/' } satisfies HeadingActionLinkProps
    },
    {
      name: 'ICS',
      component: HeadingActionAddToCalendar,
      props: {
        href: '/events/meeting.ics',
        filename: 'meeting.ics'
      } satisfies HeadingActionAddToCalendarProps
    },
    {
      name: 'VCF',
      component: ContactVcfLink,
      props: {
        vcf: {
          kind: 'organization',
          organization: 'Пример',
          downloadUrl: '/sarafan/example/contact.vcf',
          filename: 'example.vcf'
        }
      } satisfies ContactVcfLinkProps
    }
  ])(
    'preserves the $name link contract with one native interactive element',
    async ({ component, props }) => {
      const container = await createAstroContainer();
      const html = await container.renderToString(component, { props });
      const window = new Window();
      windows.push(window);
      window.document.body.innerHTML = html;
      const link = window.document.querySelector('a');
      expect({
        interactiveElements: window.document.querySelectorAll('a, button').length,
        href: link?.getAttribute('href'),
        label: link?.getAttribute('aria-label'),
        tooltip: link?.getAttribute('title'),
        target: link?.getAttribute('target') ?? undefined,
        rel: link?.getAttribute('rel') ?? undefined,
        filename: link?.getAttribute('download') ?? undefined,
        prefetch: link?.getAttribute('data-astro-prefetch') ?? undefined,
        decorative: link?.querySelector('svg')?.getAttribute('aria-hidden')
      }).toMatchSnapshot();
    }
  );

  it('derives calendar URL, accessible name and tooltip from the same year and keeps the DOM hook', async () => {
    const container = await createAstroContainer();
    const results = [];
    for (const year of [2026, 2027]) {
      const window = new Window();
      windows.push(window);
      window.document.body.innerHTML = await container.renderToString(HeadingActionStatusCalendar, {
        props: { year }
      });
      const link = window.document.querySelector('a');
      results.push({
        interactiveElements: window.document.querySelectorAll('a, button').length,
        href: link?.getAttribute('href'),
        label: link?.getAttribute('aria-label'),
        tooltip: link?.getAttribute('title'),
        hook: link?.hasAttribute('data-status-calendar-entry'),
        decorative: link?.querySelector('svg')?.getAttribute('aria-hidden')
      });
    }
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "decorative": "true",
          "hook": true,
          "href": "/status/calendar/2026/",
          "interactiveElements": 1,
          "label": "Проблемы и плановые работы за 2026 год",
          "tooltip": "Проблемы и плановые работы за 2026 год",
        },
        {
          "decorative": "true",
          "hook": true,
          "href": "/status/calendar/2027/",
          "interactiveElements": 1,
          "label": "Проблемы и плановые работы за 2027 год",
          "tooltip": "Проблемы и плановые работы за 2027 год",
        },
      ]
    `);
  });
});
