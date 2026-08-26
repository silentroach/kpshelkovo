import { describe, expect, it } from 'vitest';

import type { ContactWithVcf } from '../types';
import { buildContactVcard } from '../vcard';

const contact = {
  slug: 'alexander-eremin',
  title: 'Александр Ерёмин',
  category: 'electricity',
  updatedAt: new Date('2026-07-13T00:00:00.000Z'),
  updatedIso: '2026-07-13',
  summary:
    'Консультации по электричеству и помощь с взаимодействием с Россетями и Мосэнергосбытом',
  contacts: {
    phone: '+7 985 414-57-87',
    telegram: 'https://t.me/Alexeremin2006',
    email: 'alexander@example.com',
    website: 'https://example-electrician.ru',
  },
  location: {
    title: 'Шелково',
    url: 'https://example.com/map',
    address: 'КП Шелково, ул. Лесная, 1',
    coordinates: { lat: 55.123456, lng: 38.654321 },
  },
  reviews: [],
  url: '/sarafan/electricity/alexander-eremin/',
  markdownUrl: '/sarafan/electricity/alexander-eremin/index.md',
  canonical: 'https://kpshelkovo.online/sarafan/electricity/alexander-eremin/',
  body: 'Консультирует по вопросам электричества.',
  mentions: [],
  vcf: {
    kind: 'person',
    downloadUrl: '/sarafan/electricity/alexander-eremin/contact.vcf',
    filename: 'alexander-eremin.vcf',
    name: {
      family: 'Ерёмин',
      given: 'Александр',
    },
    phone: '+7 900 000-00-00',
    organization: 'Электрика; Шелково',
    jobTitle: 'Электрик',
    note: 'Помогает с электричеством, Россетями\nи Мосэнергосбытом.',
  },
} satisfies ContactWithVcf;

describe('contact vCard', () => {
  it('combines card defaults with explicit vCard overrides', () => {
    expect(buildContactVcard(contact).replaceAll('\r\n', '\n'))
      .toMatchInlineSnapshot(`
        "BEGIN:VCARD
        VERSION:3.0
        PRODID:-//vcard-creator//vcard-creator 1.0.0//EN
        FN;CHARSET=UTF-8:Александр Ерёмин
        N;CHARSET=UTF-8:Ерёмин;Александр;;;
        TEL;TYPE=CELL,VOICE:+7 900 000-00-00
        EMAIL;TYPE=INTERNET:alexander@example.com
        item1.URL:https://t.me/Alexeremin2006
        item1.X-ABLABEL;CHARSET=UTF-8:Telegram
        ADR;TYPE=WORK;CHARSET=UTF-8:;;КП Шелково\\, ул. Лесная\\, 1;
         ;;;
        ORG;CHARSET=UTF-8:Электрика\\; Шелково
        TITLE;CHARSET=UTF-8:Электрик
        URL;TYPE=WORK:https://example-electrician.ru
        URL:https://kpshelkovo.online/sarafan/electricity/alexander-eremin/
        item3.URL:https://example.com/map
        item3.X-ABLABEL;CHARSET=UTF-8:Карта
        GEO:55.123456;38.654321
        NOTE;CHARSET=UTF-8:Помогает с электричеством\\, Ро
         ссетями\\nи Мосэнергосбытом.
        REV:2026-07-13T00:00:00.000Z
        END:VCARD
        "
      `);
  });

  it('builds an organization card with its address and map point', () => {
    const organization = {
      ...contact,
      slug: 'zoloto-sibiri-kora',
      title: 'Кора в Малино',
      category: 'garden',
      updatedAt: new Date('2026-07-13T00:00:00.000Z'),
      updatedIso: '2026-07-13',
      summary: 'Производство коры в Малино.',
      contacts: { phone: '+7 991 737-55-56' },
      location: {
        title: 'Золото Сибири',
        url: 'https://yandex.ru/maps/-/CTq-BEOk',
        address: 'Пионерская ул., 21, пгт Малино',
        coordinates: { lat: 55.116326, lng: 38.16951 },
      },
      canonical: 'https://kpshelkovo.online/sarafan/garden/zoloto-sibiri-kora/',
      vcf: {
        kind: 'organization',
        downloadUrl: '/sarafan/garden/zoloto-sibiri-kora/contact.vcf',
        filename: 'zoloto-sibiri-kora.vcf',
        organization: 'Золото Сибири',
      },
    } satisfies ContactWithVcf;

    expect(buildContactVcard(organization).replaceAll('\r\n', '\n'))
      .toMatchInlineSnapshot(`
        "BEGIN:VCARD
        VERSION:3.0
        PRODID:-//vcard-creator//vcard-creator 1.0.0//EN
        FN;CHARSET=UTF-8:Золото Сибири
        N;CHARSET=UTF-8:;;;;
        TEL;TYPE=CELL,VOICE:+7 991 737-55-56
        ADR;TYPE=WORK;CHARSET=UTF-8:;;Пионерская ул.\\, 21\\, пгт Ма
         лино;;;;
        ORG;CHARSET=UTF-8:Золото Сибири
        X-ABSHOWAS:COMPANY
        URL:https://kpshelkovo.online/sarafan/garden/zoloto-sibiri-kora/
        item3.URL:https://yandex.ru/maps/-/CTq-BEOk
        item3.X-ABLABEL;CHARSET=UTF-8:Карта
        GEO:55.116326;38.16951
        NOTE;CHARSET=UTF-8:Производство коры в Малино.
        REV:2026-07-13T00:00:00.000Z
        END:VCARD
        "
      `);
  });

  it('folds every physical line to 75 UTF-8 bytes', () => {
    const lines = buildContactVcard(contact).split('\r\n');

    expect(
      lines.every((line) => new TextEncoder().encode(line).length <= 75),
    ).toBe(true);
  });
});
