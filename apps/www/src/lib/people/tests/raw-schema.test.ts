import { describe, expect, it } from 'vitest';

import { RawPersonProfileSchema } from '../raw-schema';

const profile = {
  name: '  Кирилл Щемелинин  ',
  seo: {
    description: '  Исполняющий обязанности директора по эксплуатации.  ',
  },
  name_cases: {
    gen: '  Кирилла Щемелинина  ',
    dat: '  Кириллу Щемелинину  ',
    acc: '  Кирилла Щемелинина  ',
    ins: '  Кириллом Щемелининым  ',
    prep: '  Кирилле Щемелинине  ',
  },
  company: '  ОК «Комфорт»  ',
  position: '  Исполняющий обязанности директора по эксплуатации  ',
  contacts: [
    { type: 'telegram', value: '  Kirill_ZemlyaMO  ' },
    { type: 'phone', value: '  +7 (967) 246-37-49  ' },
  ],
} as const;

const validationIssues = (input: unknown) => {
  const result = RawPersonProfileSchema.safeParse(input);

  if (result.success) {
    throw new Error('Expected person profile validation to fail');
  }

  return result.error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
  }));
};

describe('RawPersonProfileSchema', () => {
  it('accepts and trims the complete person profile contract', () => {
    expect(RawPersonProfileSchema.parse(profile)).toMatchInlineSnapshot(`
      {
        "company": "ОК «Комфорт»",
        "contacts": [
          {
            "type": "telegram",
            "value": "Kirill_ZemlyaMO",
          },
          {
            "type": "phone",
            "value": "+7 (967) 246-37-49",
          },
        ],
        "name": "Кирилл Щемелинин",
        "name_cases": {
          "acc": "Кирилла Щемелинина",
          "dat": "Кириллу Щемелинину",
          "gen": "Кирилла Щемелинина",
          "ins": "Кириллом Щемелининым",
          "prep": "Кирилле Щемелинине",
        },
        "position": "Исполняющий обязанности директора по эксплуатации",
        "seo": {
          "description": "Исполняющий обязанности директора по эксплуатации.",
        },
      }
    `);
  });

  it.each([
    {
      field: 'name',
      input: { ...profile, name: ' \t ' },
      path: ['name'],
    },
    {
      field: 'seo.description',
      input: { ...profile, seo: { description: ' \t ' } },
      path: ['seo', 'description'],
    },
    ...(['gen', 'dat', 'acc', 'ins', 'prep'] as const).map((nameCase) => ({
      field: `name_cases.${nameCase}`,
      input: {
        ...profile,
        name_cases: { ...profile.name_cases, [nameCase]: ' \t ' },
      },
      path: ['name_cases', nameCase],
    })),
    {
      field: 'company',
      input: { ...profile, company: ' \t ' },
      path: ['company'],
    },
    {
      field: 'position',
      input: { ...profile, position: ' \t ' },
      path: ['position'],
    },
    {
      field: 'contacts[].value',
      input: {
        ...profile,
        contacts: [{ type: 'telegram', value: ' \t ' }],
      },
      path: ['contacts', 0, 'value'],
    },
  ])('rejects whitespace-only $field', ({ input, path }) => {
    expect(validationIssues(input)).toEqual([
      {
        path,
        message: 'must not be blank',
      },
    ]);
  });
});
