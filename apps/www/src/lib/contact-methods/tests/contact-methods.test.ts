import { describe, expect, it } from 'vitest';

import { mapRawContactMethods } from '../mapper';
import { RawContactMethodsSchema } from '../raw-schema';
import { contactMethods } from '../view';

describe('shared contact methods', () => {
  it('maps source methods into the readonly domain without changing contact actions', () => {
    const raw = RawContactMethodsSchema.parse({
      phone: ' 8 (996) 967-00-18 ',
      telegram: ' https://t.me/example ',
      whatsapp: 'https://wa.me/79969670018',
      email: 'team@example.com',
      website: 'https://example.com'
    });
    const mapped = mapRawContactMethods(raw);

    expect(mapped).not.toBe(raw);
    expect(mapped).toMatchInlineSnapshot(`
      {
        "email": "team@example.com",
        "phone": "8 (996) 967-00-18",
        "telegram": "https://t.me/example",
        "website": "https://example.com",
        "whatsapp": "https://wa.me/79969670018",
      }
    `);
    expect(contactMethods(mapped).map(({ href }) => href)).toMatchInlineSnapshot(`
      [
        "tel:+79969670018",
        "https://t.me/example",
        "https://wa.me/79969670018",
        "mailto:team@example.com",
        "https://example.com",
      ]
    `);
  });

  it.each([
    {},
    { phone: '   ' },
    { telegram: '@example' },
    { telegram: 'http://t.me/example' },
    { telegram: 'tg://resolve?domain=example' },
    { phone: '+7 900 000-00-00', address: 'Unknown field' }
  ])('rejects missing methods and unsupported source formats: %j', (contacts) => {
    expect(RawContactMethodsSchema.safeParse(contacts).success).toBe(false);
  });

  it.each([
    { phone: '+7 900 000-00-00 доб. 123' },
    { telegram: 'https://t.me/example' },
    { whatsapp: 'https://wa.me/79000000000' },
    { email: 'team@example.com' },
    { website: 'https://example.com' }
  ])('allows each supported method on its own: %j', (contacts) => {
    expect(RawContactMethodsSchema.safeParse(contacts).success).toBe(true);
  });
});
