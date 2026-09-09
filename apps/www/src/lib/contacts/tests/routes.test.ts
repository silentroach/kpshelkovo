import { describe, expect, it } from 'vitest';

import {
  contactCanonical,
  contactCategoryMarkdownPattern,
  contactCategoryMarkdownUrl,
  contactCategoryPattern,
  contactCategoryUrl,
  contactMarkdownPattern,
  contactMarkdownUrl,
  contactPattern,
  contactVcfPattern,
  contactVcfUrl,
  contactsMarkdownUrl,
  contactsUrl,
  contactUrl
} from '../routes';

describe('contact routes', () => {
  it('builds stable index, category and detail URLs', () => {
    const contact = { category: 'fence', slug: 'ivan-petrov-fence' };

    expect(contactsUrl()).toBe('/sarafan/');
    expect(contactsMarkdownUrl()).toBe('/sarafan/index.md');
    expect(contactCategoryUrl(contact)).toBe('/sarafan/fence/');
    expect(contactCategoryMarkdownUrl(contact)).toBe('/sarafan/fence/index.md');
    expect(contactUrl(contact)).toBe('/sarafan/fence/ivan-petrov-fence/');
    expect(contactMarkdownUrl(contact)).toBe('/sarafan/fence/ivan-petrov-fence/index.md');
    expect(contactVcfUrl(contact)).toBe('/sarafan/fence/ivan-petrov-fence/contact.vcf');
    expect(contactCanonical(contact)).toBe(
      'https://kpshelkovo.online/sarafan/fence/ivan-petrov-fence/'
    );
  });

  it('rejects malformed slugs before building public URLs', () => {
    expect(() => contactUrl({ category: 'fence', slug: 'Bad Slug' })).toThrow(/contact slug/u);
    expect(() => contactCategoryUrl({ category: 'unknown' })).toThrow(/contact category/u);
  });

  it('exposes route patterns for public surface registration', () => {
    expect(contactCategoryPattern()).toBe('/sarafan/:category/');
    expect(contactCategoryMarkdownPattern()).toBe('/sarafan/:category/index.md');
    expect(contactPattern()).toBe('/sarafan/:category/:slug/');
    expect(contactMarkdownPattern()).toBe('/sarafan/:category/:slug/index.md');
    expect(contactVcfPattern()).toBe('/sarafan/:category/:slug/contact.vcf');
  });
});
