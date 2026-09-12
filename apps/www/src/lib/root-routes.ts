import { withBase } from './site';

const SITE_MARKDOWN = '/index.md';
const SITE_LLMS = '/llms.txt';
const SITE_API_CATALOG = '/.well-known/api-catalog';

export const siteMarkdownPath = (): string => SITE_MARKDOWN;

export const siteMarkdownUrl = (): string => withBase(SITE_MARKDOWN);

export const siteLlmsPath = (): string => SITE_LLMS;

export const siteLlmsUrl = (): string => withBase(SITE_LLMS);

export const siteApiCatalogPath = (): string => SITE_API_CATALOG;

export const siteApiCatalogUrl = (): string => withBase(SITE_API_CATALOG);
