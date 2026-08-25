import { z } from 'astro/zod';

import { PERSON_CONTACT_TYPES } from './schema';

const nonBlankText = z.string().trim().min(1, 'must not be blank');

const personNameCases = () =>
  z
    .object({
      gen: nonBlankText.optional(),
      dat: nonBlankText.optional(),
      acc: nonBlankText.optional(),
      ins: nonBlankText.optional(),
      prep: nonBlankText.optional(),
    })
    .strict();

const personContact = () =>
  z.object({
    type: z.enum(PERSON_CONTACT_TYPES),
    value: nonBlankText,
  });

const personSeo = () =>
  z
    .object({
      description: nonBlankText.optional(),
    })
    .strict();

export const RawPersonProfileSchema = z.object({
  name: nonBlankText,
  seo: personSeo().optional(),
  name_cases: personNameCases().optional(),
  company: nonBlankText.optional(),
  position: nonBlankText.optional(),
  contacts: z.array(personContact()),
});

export type RawPersonProfile = z.output<typeof RawPersonProfileSchema>;
export type RawPersonContact = RawPersonProfile['contacts'][number];
