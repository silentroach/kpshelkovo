/// <reference types="astro/client" />

// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import CalendarPlusIcon from '@shelkovo/ui/icons/system/CalendarPlus.astro';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import ContactCardIcon from '@shelkovo/ui/icons/system/ContactCard.astro';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import FoldedMapIcon from '@shelkovo/ui/icons/system/FoldedMap.astro';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import GlobeIcon from '@shelkovo/ui/icons/system/Globe.astro';
import { Window } from 'happy-dom';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

import type { HeadingActionProps } from '../heading-action.types';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import HeadingAction from '../HeadingAction.astro';

const windows: Window[] = [];
afterEach(async () => {
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

const renderAction = async (props: HeadingActionProps) => {
  const container = await createAstroContainer();
  const html = await container.renderToString(HeadingAction, { props: { ...props } });
  const window = new Window();
  windows.push(window);
  window.document.body.innerHTML = html;
  return window.document;
};

describe('HeadingAction', () => {
  it('requires a component icon and a destination for resource links', () => {
    expectTypeOf<{
      icon: string;
      label: string;
      href: string;
    }>().not.toMatchTypeOf<HeadingActionProps>();
    expectTypeOf<{
      icon: HeadingActionProps['icon'];
      label: string;
      resource: true;
    }>().not.toMatchTypeOf<HeadingActionProps>();
  });

  it('renders a single native link with a decorative icon and default tooltip', async () => {
    const document = await renderAction({
      icon: GlobeIcon,
      label: 'Сайт посёлка',
      href: 'https://example.com/',
      target: '_blank',
      rel: 'noopener noreferrer',
      id: 'website',
      'data-heading-action': 'website'
    });
    const link = document.querySelector('a');
    expect({
      interactiveElements: document.querySelectorAll('a, button').length,
      href: link?.getAttribute('href'),
      label: link?.getAttribute('aria-label'),
      tooltip: link?.getAttribute('title'),
      target: link?.getAttribute('target'),
      rel: link?.getAttribute('rel'),
      id: link?.id,
      hook: link?.getAttribute('data-heading-action'),
      decorative: link?.querySelector('svg')?.getAttribute('aria-hidden'),
      prefetch: link?.getAttribute('data-astro-prefetch') ?? undefined
    }).toMatchInlineSnapshot(`
      {
        "decorative": "true",
        "hook": "website",
        "href": "https://example.com/",
        "id": "website",
        "interactiveElements": 1,
        "label": "Сайт посёлка",
        "prefetch": undefined,
        "rel": "noopener noreferrer",
        "target": "_blank",
        "tooltip": "Сайт посёлка",
      }
    `);
  });

  it('keeps a distinct tooltip and ResourceLink download behaviour', async () => {
    const document = await renderAction({
      icon: CalendarPlusIcon,
      label: 'Добавить в календарь',
      title: 'Скачать календарь встречи',
      href: '/events/meeting.ics',
      download: 'meeting.ics',
      resource: true,
      'data-status-calendar-entry': ''
    });
    const link = document.querySelector('a');
    expect({
      interactiveElements: document.querySelectorAll('a, button').length,
      label: link?.getAttribute('aria-label'),
      tooltip: link?.getAttribute('title'),
      href: link?.getAttribute('href'),
      filename: link?.getAttribute('download'),
      prefetch: link?.getAttribute('data-astro-prefetch'),
      hook: link?.hasAttribute('data-status-calendar-entry'),
      forcesNewTab: link?.hasAttribute('target'),
      leaksResourceProp: link?.hasAttribute('resource')
    }).toMatchInlineSnapshot(`
      {
        "filename": "meeting.ics",
        "forcesNewTab": false,
        "hook": true,
        "href": "/events/meeting.ics",
        "interactiveElements": 1,
        "label": "Добавить в календарь",
        "leaksResourceProp": false,
        "prefetch": "false",
        "tooltip": "Скачать календарь встречи",
      }
    `);
  });

  it('uses a button with a safe default type and preserves client hooks', async () => {
    const document = await renderAction({
      icon: FoldedMapIcon,
      label: 'Показать карту',
      id: 'open-map',
      'data-map-toggle': '',
      'aria-controls': 'map-panel',
      'aria-expanded': false
    });
    const button = document.querySelector('button');
    expect({
      interactiveElements: document.querySelectorAll('a, button').length,
      type: button?.getAttribute('type'),
      label: button?.getAttribute('aria-label'),
      tooltip: button?.getAttribute('title'),
      id: button?.id,
      hook: button?.hasAttribute('data-map-toggle'),
      controls: button?.getAttribute('aria-controls'),
      expanded: button?.getAttribute('aria-expanded'),
      decorative: button?.querySelector('svg')?.getAttribute('aria-hidden'),
      hasHref: button?.hasAttribute('href')
    }).toMatchInlineSnapshot(`
      {
        "controls": "map-panel",
        "decorative": "true",
        "expanded": "false",
        "hasHref": false,
        "hook": true,
        "id": "open-map",
        "interactiveElements": 1,
        "label": "Показать карту",
        "tooltip": "Показать карту",
        "type": "button",
      }
    `);
  });

  it('preserves an explicit button type and disabled state', async () => {
    const document = await renderAction({
      icon: ContactCardIcon,
      label: 'Отправить',
      type: 'submit',
      disabled: true
    });
    const button = document.querySelector('button');
    expect({ type: button?.type, disabled: button?.disabled }).toMatchInlineSnapshot(`
      {
        "disabled": true,
        "type": "submit",
      }
    `);
  });

  it('treats an empty href as a native link, not a button', async () => {
    const document = await renderAction({ icon: GlobeIcon, label: 'Обновить', href: '' });
    expect(document.querySelector('a')?.getAttribute('href')).toBe('');
    expect(document.querySelector('button')).toBeFalsy();
  });
});
