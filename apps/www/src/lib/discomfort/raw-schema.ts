import { z } from 'astro/zod';

const text = z.string().trim().min(1);
const DATE = /^\d{4}-\d{2}-\d{2}$/u;

const isCalendarDate = (value: string): boolean => {
  if (!DATE.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
};

const calendarDate = (name: string) =>
  z.union([text, z.date()]).transform((value, ctx) => {
    const normalized =
      value instanceof Date ? value.toISOString().slice(0, 10) : value;

    if (isCalendarDate(normalized)) {
      return normalized;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${name} must use YYYY-MM-DD`,
    });

    return z.NEVER;
  });

export const RawDiscomfortEventSchema = z
  .object({
    date: calendarDate('date'),
    updated_at: calendarDate('updated_at').optional(),
    title: text,
  })
  .strict()
  .superRefine((event, ctx) => {
    if (event.updated_at && event.updated_at < event.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'updated_at cannot be earlier than date',
        path: ['updated_at'],
      });
    }
  });

export type RawDiscomfortEvent = z.output<typeof RawDiscomfortEventSchema>;
