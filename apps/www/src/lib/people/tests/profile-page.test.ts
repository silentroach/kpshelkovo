/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_PERSON_BACKLINKS } from '@/lib/people/types';
import type { PersonProfile } from '@/lib/people/types';
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
