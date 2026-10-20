import { z } from 'astro/zod';

const nonBlankText = z.string().trim().min(1);

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const contactUrl = nonBlankText.url().refine(isHttpsUrl, {
  message: 'url must use https://'
});

export const RawContactMethodsSchema = z
  .object({
    phone: nonBlankText.optional(),
    telegram: contactUrl.optional(),
    whatsapp: contactUrl.optional(),
    email: nonBlankText.email().optional(),
    website: contactUrl.optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.phone || value.telegram || value.whatsapp || value.email || value.website) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'contacts must include at least one public contact method'
    });
  });

export type RawContactMethods = z.output<typeof RawContactMethodsSchema>;
