import { z } from 'zod';

import { ENTITY_MENTION_TYPES } from '@/lib/mentions';
import {
  publicDateTimeSchema,
  publicUriSchema,
} from '@/lib/public-schema-formats';
import {
  PERSON_BACKLINK_KINDS,
  PERSON_CONTACT_TYPES,
  PERSON_MENTION_SECTIONS,
} from './schema';

type DeepReadonly<T> = T extends readonly unknown[]
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T;

type PeoplePublicDto<T extends z.ZodType> = DeepReadonly<z.infer<T>>;

// z.int() would add a safe-integer maximum absent from the public contract.
const integer = (minimum = 0) =>
  z.number().min(minimum).refine(Number.isInteger).meta({ type: 'integer' });

const contactTypeSchema = z
  .enum(PERSON_CONTACT_TYPES)
  .meta({ id: 'contactType' });
const sectionSchema = z.enum(PERSON_MENTION_SECTIONS).meta({ id: 'section' });
const kindSchema = z.enum(PERSON_BACKLINK_KINDS).meta({ id: 'kind' });

const nameCasesSchema = z
  .strictObject({
    gen: z.string().min(1).optional(),
    dat: z.string().min(1).optional(),
    acc: z.string().min(1).optional(),
    ins: z.string().min(1).optional(),
    prep: z.string().min(1).optional(),
  })
  .meta({ id: 'nameCases' });

const contactSchema = z
  .strictObject({
    type: contactTypeSchema,
    value: z.string().min(1),
    display: z.string().min(1),
    href: publicUriSchema(),
  })
  .meta({ id: 'contact' });

const mentionSchema = z
  .strictObject({
    type: z.enum(ENTITY_MENTION_TYPES),
    slug: z.string().min(1),
    name: z.string().min(1),
    company: z.string().min(1).optional(),
    position: z.string().min(1).optional(),
    html_url: publicUriSchema(),
    markdown_url: publicUriSchema(),
  })
  .meta({ id: 'mention' });

const backlinkSchema = z
  .strictObject({
    section: sectionSchema,
    kind: kindSchema,
    source_id: z.string().min(1),
    title: z.string().min(1),
    html_url: publicUriSchema(),
    markdown_url: publicUriSchema(),
    excerpt: z.string().min(1).optional(),
    mentioned_at: publicDateTimeSchema().optional(),
  })
  .meta({ id: 'backlink' });

const backlinksSchema = z
  .strictObject({
    news: z.array(backlinkSchema),
    status: z.array(backlinkSchema),
    reviews: z.array(backlinkSchema),
    places: z.array(backlinkSchema),
    people: z.array(backlinkSchema),
    contacts: z.array(backlinkSchema),
  })
  .meta({ id: 'backlinks' });

const profileSchema = z
  .strictObject({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1),
    name_cases: nameCasesSchema.optional(),
    company: z.string().min(1).optional(),
    position: z.string().min(1).optional(),
    html_url: publicUriSchema(),
    markdown_url: publicUriSchema(),
    contacts: z.array(contactSchema),
    body_markdown: z.string(),
    mentions: z.array(mentionSchema),
    mention_count: integer(),
    backlinks: backlinksSchema,
    backlink_count: integer(),
  })
  .meta({ id: 'profile' });

const statsSchema = z
  .strictObject({
    profile_count: integer(),
    mention_count: integer(),
    backlink_count: integer(),
  })
  .meta({ id: 'stats' });

export const peoplePublicPayloadSchema = z
  .strictObject({
    stats: statsSchema,
    profiles: z.array(profileSchema),
  })
  .meta({
    title: 'PeoplePayload',
    description:
      'Полная лента профилей людей только для чтения с публичными контактами, упоминаниями и обратными ссылками по всему сайту. Исходящие упоминания людей и мест различаются по обязательному полю `type`. Упоминания учитывают `@slug`, `@slug:case` и `[текст](@slug)`; `[текст](@slug:case)` не поддерживается.',
  });

export type PeoplePublicContactDto = PeoplePublicDto<typeof contactSchema>;
export type PeoplePublicMentionDto = PeoplePublicDto<typeof mentionSchema>;
export type PeoplePublicBacklinkDto = PeoplePublicDto<typeof backlinkSchema>;
export type PeoplePublicBacklinksDto = PeoplePublicDto<typeof backlinksSchema>;
export type PeoplePublicProfileDto = PeoplePublicDto<typeof profileSchema>;
export type PeoplePublicPayloadDto = PeoplePublicDto<
  typeof peoplePublicPayloadSchema
>;

export const buildPeoplePublicJsonSchema = (
  id: string,
): Record<string, unknown> =>
  z.toJSONSchema(peoplePublicPayloadSchema, {
    override: ({ zodSchema, jsonSchema }) => {
      if (zodSchema === peoplePublicPayloadSchema) {
        jsonSchema.$id = id;
      }
    },
  });
