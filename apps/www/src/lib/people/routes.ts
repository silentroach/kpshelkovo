import { canon, withBase } from '../site';

const PEOPLE_ROOT = '/people/';
const PEOPLE_MARKDOWN = '/people/index.md';
const PEOPLE_DATA = '/people/data/people.json';
const PEOPLE_LLMS = '/people/llms.txt';
const PEOPLE_API_CATALOG = '/people/.well-known/api-catalog';
const PEOPLE_SCHEMA = '/people/schemas/people.schema.json';
const PEOPLE_OPENAPI = '/people/openapi/people.openapi.json';

const need = (value: string, name: string): string => {
  const text = value.trim();

  if (!text) {
    throw new Error(`${name} is required`);
  }

  return text;
};

export const personPath = (slug: string): string => `${PEOPLE_ROOT}${need(slug, 'slug')}/`;

export const personMarkdownPath = (slug: string): string => `${personPath(slug)}index.md`;

export const personPattern = (): string => '/people/:slug/';

export const personMarkdownPattern = (): string => '/people/:slug/index.md';

export const peoplePath = (): string => PEOPLE_ROOT;

export const peopleMarkdownPath = (): string => PEOPLE_MARKDOWN;

export const peopleDataPath = (): string => PEOPLE_DATA;

export const peopleLlmsPath = (): string => PEOPLE_LLMS;

export const peopleApiCatalogPath = (): string => PEOPLE_API_CATALOG;

export const peopleSchemaPath = (): string => PEOPLE_SCHEMA;

export const peopleOpenApiPath = (): string => PEOPLE_OPENAPI;

export const peopleMarkdownUrl = (): string => withBase(PEOPLE_MARKDOWN);

export const peopleDataUrl = (): string => withBase(PEOPLE_DATA);

export const peopleLlmsUrl = (): string => withBase(PEOPLE_LLMS);

export const peopleApiCatalogUrl = (): string => withBase(PEOPLE_API_CATALOG);

export const peopleSchemaUrl = (): string => withBase(PEOPLE_SCHEMA);

export const peopleOpenApiUrl = (): string => withBase(PEOPLE_OPENAPI);

export const personUrl = (slug: string): string => withBase(personPath(slug));

export const personMarkdownUrl = (slug: string): string => withBase(personMarkdownPath(slug));

export const personCanonical = (slug: string): string => canon(personPath(slug));
