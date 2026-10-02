import { z } from 'zod';

export const nginxLiteralSchema = z
  .string()
  .min(1)
  // eslint-disable-next-line no-control-regex -- Config literals must reject control characters.
  .regex(/^[^\u0000-\u001f\u007f]+$/u);

export const responseMetadataSchema = z.strictObject({
  'content-type': nginxLiteralSchema,
  link: nginxLiteralSchema.optional(),
  'content-disposition': nginxLiteralSchema.optional(),
  'x-robots-tag': nginxLiteralSchema.optional(),
  vary: nginxLiteralSchema.optional()
});
