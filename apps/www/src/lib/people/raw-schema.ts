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
      prep: nonBlankText.optional()
    })
    .strict();

const personContact = () =>
  z.object({
    type: z.enum(PERSON_CONTACT_TYPES),
    value: nonBlankText
  });

const personSeo = () =>
  z
    .object({
      description: nonBlankText.optional()
    })
    .strict();

const personPhoto = z.object({
  src: z.url({ protocol: /^https$/, hostname: /^media\.kpshelkovo\.online$/ }).refine((value) => {
    const url = URL.parse(value);
    return Boolean(url && !url.search && !url.hash && !url.username && !url.password && !url.port);
  }, 'photo.src must use the public media origin without credentials, query or hash'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  source: z
    .object({
      label: nonBlankText,
      url: z.url({ protocol: /^https?$/ })
    })
    .optional()
});

export const RawPersonProfileSchema = z.object({
  name: nonBlankText,
  seo: personSeo().optional(),
  name_cases: personNameCases().optional(),
  company: nonBlankText.optional(),
  position: nonBlankText.optional(),
  photo: personPhoto.optional(),
  contacts: z.array(personContact())
});

export type RawPersonProfile = z.output<typeof RawPersonProfileSchema>;
export type RawPersonContact = RawPersonProfile['contacts'][number];
