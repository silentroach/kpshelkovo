import { parseMarkdownFragment } from '@shelkovo/markdown';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createSiteMentionRegistry } from '@/lib/mentions';

import { RawPersonProfileSchema } from '../raw-schema';
import type { PersonPhoto } from '../types';

let mapRawPersonProfile: typeof import('../mapper').mapRawPersonProfile;
let buildPersonMarkdown: typeof import('../view').buildPersonMarkdown;
let buildPeoplePublicPayload: typeof import('../public-dto').buildPeoplePublicPayload;
let personProfilePageSchema: typeof import('../seo').personProfilePageSchema;
let schema: typeof import('../discovery').schema;
let openapi: typeof import('../discovery').openapi;

beforeAll(async () => {
  Object.assign(import.meta.env, { SITE: 'https://example.com', BASE_URL: '/' });
  ({ mapRawPersonProfile } = await import('../mapper'));
  ({ buildPersonMarkdown } = await import('../view'));
  ({ buildPeoplePublicPayload } = await import('../public-dto'));
  ({ personProfilePageSchema } = await import('../seo'));
  ({ schema, openapi } = await import('../discovery'));
});

const portrait: PersonPhoto = {
  src: 'https://media.kpshelkovo.online/people/test-person.jpeg',
  width: 449,
  height: 600
};
const source = { label: 'Источник фотографии', url: 'https://example.org/team/' };
const rawProfile = {
  name: 'Имя Фамилия',
  position: 'Управляющий',
  company: 'Организация профиля',
  contacts: [{ type: 'phone', value: '+7 900 000-00-00' }]
};

describe('people photos', () => {
  it.each([
    { label: 'with attribution', photo: { ...portrait, source } },
    { label: 'without attribution', photo: portrait },
    { label: 'without a photo', photo: undefined }
  ])('preserves the portrait across public representations $label', ({ photo }) => {
    const profile = mapRawPersonProfile(
      {
        id: 'test-person',
        data: RawPersonProfileSchema.parse({ ...rawProfile, photo }),
        body: 'Описание человека.'
      },
      createSiteMentionRegistry([])
    );
    expect(profile.photo).toEqual(photo);

    const payload = JSON.parse(JSON.stringify(buildPeoplePublicPayload({ profiles: [profile] })));
    expect(z.fromJSONSchema(schema('https://example.com')).safeParse(payload).success).toBe(true);
    expect(payload.profiles[0].photo).toEqual(photo);
    if (!photo) expect(payload.profiles[0]).not.toHaveProperty('photo');
    else if (!photo.source) expect(payload.profiles[0].photo).not.toHaveProperty('source');
    expect(payload.profiles[0].body_markdown).toBe(profile.body);

    const blocks = parseMarkdownFragment(buildPersonMarkdown(profile));
    const imageBlock = blocks.findIndex(
      (block) =>
        block.type === 'paragraph' && block.children.some((child) => child.type === 'image')
    );
    if (photo) {
      expect(imageBlock).toBe(2);
      expect(blocks[imageBlock]).toMatchObject({
        children: [{ type: 'image', url: photo.src, alt: profile.name }]
      });
      if (photo.source) {
        expect(blocks[imageBlock + 1]).toMatchObject({
          children: [
            { type: 'text' },
            { type: 'link', url: photo.source.url, children: [{ value: photo.source.label }] }
          ]
        });
      }
      expect(blocks[imageBlock + (photo.source ? 2 : 1)]?.type).toBe('heading');
    } else {
      expect(imageBlock).toBe(-1);
    }

    const entities = JSON.parse(
      JSON.stringify(
        personProfilePageSchema({
          name: profile.name,
          description: 'Описание человека.',
          url: profile.url,
          contacts: profile.contacts,
          image: profile.photo?.src
        })
      )
    );
    const person = z
      .array(z.object({ '@type': z.string(), image: z.string().optional() }))
      .parse(entities)
      .find((entity) => entity['@type'] === 'Person');
    expect(person?.image).toBe(photo?.src);
    if (!photo) expect(person).not.toHaveProperty('image');
  });

  it('describes optional photos and sources in JSON Schema and OpenAPI', () => {
    const definitions = z.object({
      $defs: z.object({
        photo: z.object({
          required: z.array(z.string()),
          properties: z.object({ source: z.object({ required: z.array(z.string()) }) })
        }),
        profile: z.object({ required: z.array(z.string()) })
      })
    });
    const json = definitions.parse(schema('https://example.com'));
    const api = z
      .object({ components: z.object({ schemas: z.object({ PeoplePayload: definitions }) }) })
      .parse(openapi('https://example.com'));
    expect(api.components.schemas.PeoplePayload).toEqual(json);
    expect(json.$defs.photo).toMatchInlineSnapshot(`
      {
        "properties": {
          "source": {
            "required": [
              "label",
              "url",
            ],
          },
        },
        "required": [
          "src",
          "width",
          "height",
        ],
      }
    `);
    expect(json.$defs.profile.required).not.toContain('photo');
  });

  it.each([
    { src: 'not-a-url' },
    { src: 'https://example.org/portrait.jpeg' },
    { src: portrait.src.replace('https:', 'http:') },
    { src: `${portrait.src}?version=2` },
    { src: `${portrait.src}#portrait` },
    { width: 0 },
    { height: 1.5 },
    { source: { label: 'Источник' } },
    { source: { url: source.url } },
    { source: { label: ' ', url: source.url } },
    { source: { label: source.label, url: 'javascript:alert(1)' } }
  ])('rejects invalid photo data %j', (invalid) => {
    expect(
      RawPersonProfileSchema.safeParse({
        ...rawProfile,
        photo: { ...portrait, ...invalid }
      }).success
    ).toBe(false);
  });
});
