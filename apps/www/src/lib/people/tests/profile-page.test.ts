/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_PERSON_BACKLINKS } from '@/lib/people/types';
import type { PersonMentionRef, PersonProfile } from '@/lib/people/types';
import { createAstroContainer } from '@/test/astro-container';

const fixture = vi.hoisted(() => ({ profile: undefined as PersonProfile | undefined }));

vi.mock('@/lib/people/load', () => ({
  loadPeopleProfiles: async () => [fixture.profile],
  loadPersonProfileWithBacklinks: async () => fixture.profile
}));

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import ProfilePage from '@/pages/people/[slug]/index.astro';

const profile: PersonProfile = {
  id: 'test-person',
  slug: 'test-person',
  name: 'Test Person',
  url: '/people/test-person/',
  markdownUrl: '/people/test-person/index.md',
  canonical: 'https://example.com/people/test-person/',
  contacts: [],
  body: 'Profile **details**.',
  mentions: [],
  backlinks: EMPTY_PERSON_BACKLINKS
};

const windows: Window[] = [];
const renderPage = async (overrides: Partial<PersonProfile> = {}) => {
  fixture.profile = { ...profile, ...overrides };
  const container = await createAstroContainer();
  const html = await container.renderToString(ProfilePage, {
    params: { slug: profile.slug },
    request: new Request(profile.canonical)
  });
  const window = new Window();
  windows.push(window);
  window.document.body.innerHTML = html;
  return window.document;
};

afterEach(async () => {
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

describe('/people/[slug]/ presentation', () => {
  it('shows a single related HTML link after the profile and excludes it from search', async () => {
    const document = await renderPage({
      backlinks: {
        ...EMPTY_PERSON_BACKLINKS,
        status: [
          {
            section: 'status',
            kind: 'maintenance',
            sourceId: '2026/11/works',
            title: 'Водоснабжение',
            htmlUrl: '/status/incidents/2026/11/works/',
            markdownUrl: '/status/incidents/2026/11/works/index.md'
          }
        ]
      }
    });
    const related = document.querySelector('section[aria-labelledby="person-related-heading"]')!;
    expect({
      links: [...related.querySelectorAll('a')].map((link) => link.getAttribute('href')),
      lists: related.querySelectorAll('ul').length,
      nestedSections: related.querySelectorAll('section').length,
      times: related.querySelectorAll('time').length,
      kind: related.querySelector('li p')?.textContent.trim(),
      ignored: related.getAttribute('data-pagefind-ignore'),
      afterProfile: !!(document.querySelector('article')!.compareDocumentPosition(related) & 4)
    }).toMatchInlineSnapshot(`
      {
        "afterProfile": true,
        "ignored": "all",
        "kind": "Плановые работы",
        "links": [
          "/status/incidents/2026/11/works/",
        ],
        "lists": 1,
        "nestedSections": 0,
        "times": 0,
      }
    `);
  });

  it('limits the combined HTML list and preserves kind, dates and safe full titles', async () => {
    const news: readonly PersonMentionRef[] = Array.from({ length: 6 }, (_, index) => ({
      section: 'news',
      kind: 'article',
      sourceId: `news-${index}`,
      title: `News ${index}`,
      htmlUrl: `/news/item-${index}/`,
      markdownUrl: `/news/item-${index}/index.md`,
      mentionedAt: `2026-10-0${index + 1}T09:00:00+03:00`,
      excerpt: 'Excerpt must not appear in HTML'
    }));
    const document = await renderPage({
      backlinks: {
        ...EMPTY_PERSON_BACKLINKS,
        news,
        status: [
          {
            section: 'status',
            kind: 'incident',
            sourceId: 'incident',
            title: 'Вода <script>опасный текст</script>',
            htmlUrl: '/status/incidents/incident/',
            markdownUrl: '/status/incidents/incident/index.md',
            mentionedAt: '2026-11-05T09:00:00+03:00'
          },
          {
            section: 'status',
            kind: 'maintenance',
            sourceId: 'works',
            title: 'Вода',
            htmlUrl: '/status/incidents/works/',
            markdownUrl: '/status/incidents/works/index.md',
            mentionedAt: '2026-11-04T09:00:00+03:00'
          }
        ]
      }
    });
    const related = document.querySelector('section[aria-labelledby="person-related-heading"]')!;
    const rows = [...related.querySelectorAll('li')];
    expect(
      rows.map((row) => ({
        href: row.querySelector('a')?.getAttribute('href'),
        kind: row.querySelector('p span')?.textContent.trim(),
        date: row.querySelector('time')?.getAttribute('datetime')
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "date": "2026-11-05T09:00:00+03:00",
          "href": "/status/incidents/incident/",
          "kind": "Инцидент",
        },
        {
          "date": "2026-11-04T09:00:00+03:00",
          "href": "/status/incidents/works/",
          "kind": "Плановые работы",
        },
        {
          "date": "2026-10-06T09:00:00+03:00",
          "href": "/news/item-5/",
          "kind": "Новость",
        },
        {
          "date": "2026-10-05T09:00:00+03:00",
          "href": "/news/item-4/",
          "kind": "Новость",
        },
        {
          "date": "2026-10-04T09:00:00+03:00",
          "href": "/news/item-3/",
          "kind": "Новость",
        },
        {
          "date": "2026-10-03T09:00:00+03:00",
          "href": "/news/item-2/",
          "kind": "Новость",
        },
      ]
    `);
    expect(rows[0]!.querySelector('a')?.textContent).toContain('<script>опасный текст</script>');
    expect(related.querySelectorAll('script').length).toBe(0);
    expect(related.textContent).not.toContain('Excerpt must not appear in HTML');
  });

  it.each([
    { position: 'Service manager', company: 'Example company' },
    { position: 'Service manager', company: undefined },
    { position: undefined, company: 'Example company' },
    { position: undefined, company: undefined }
  ])('renders only supplied role lines: $position / $company', async (role) => {
    const document = await renderPage(role);
    const group = document.querySelector('main header .person-profile__role');
    const lines = [...(group?.children ?? [])];

    expect(lines.map((line) => line.textContent.trim())).toEqual(
      [role.position, role.company].filter((value) => value !== undefined)
    );
    expect(!!group).toBe(!!(role.position || role.company));
    expect(lines.every((line) => line.tagName === 'P')).toBe(true);
  });

  it('keeps the name and Markdown body without photo, role or empty contact region', async () => {
    const document = await renderPage();
    const main = document.querySelector('main');

    expect({
      name: main?.querySelector('h1')?.textContent.trim(),
      body: main?.querySelector('article strong')?.textContent,
      hiddenContent: [...(main?.querySelectorAll('h1, article') ?? [])].some(
        (element) => !!element.closest('[hidden], [aria-hidden="true"]')
      ),
      figures: main?.querySelectorAll('figure').length,
      sections: main?.querySelectorAll('section').length,
      contactHeading: !!main?.querySelector('#person-contacts'),
      contactBlock: !!main?.querySelector('.person-profile__contacts')
    }).toMatchInlineSnapshot(`
      {
        "body": "details",
        "contactBlock": false,
        "contactHeading": false,
        "figures": 0,
        "hiddenContent": false,
        "name": "Test Person",
        "sections": 0,
      }
    `);
  });

  it('preserves contact and photo-source links in contacts → photo → body reading order', async () => {
    const contacts: PersonProfile['contacts'] = [
      {
        type: 'phone',
        value: '+79991234567',
        display: '+7 999 123-45-67',
        href: 'tel:+79991234567'
      },
      {
        type: 'telegram',
        value: 'test_person',
        display: '@test_person',
        href: 'https://t.me/test_person'
      }
    ];
    const photo: PersonProfile['photo'] = {
      src: 'https://example.com/portrait.jpg',
      width: 400,
      height: 600,
      source: { label: 'Original portrait', url: 'https://example.com/source' }
    };
    const document = await renderPage({ contacts, photo });
    const main = document.querySelector('main');
    const contactRegion = main?.querySelector('section[aria-labelledby="person-contacts"]');
    const figure = main?.querySelector('figure');

    expect(
      [...contactRegion!.querySelectorAll('a')].map((link) => link.getAttribute('href'))
    ).toEqual(contacts.map((contact) => contact.href));
    expect(figure?.querySelector('figcaption a')?.getAttribute('href')).toBe(photo.source?.url);
    expect(figure?.querySelector('img')?.getAttribute('alt')).toBe(profile.name);
    expect(
      [...main!.querySelectorAll('.person-profile__contacts, figure, .person-profile__body')].map(
        (element) => element.tagName
      )
    ).toMatchInlineSnapshot(`
      [
        "SECTION",
        "FIGURE",
        "DIV",
      ]
    `);
  });
});
