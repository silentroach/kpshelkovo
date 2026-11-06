import { compareRuText } from '@shelkovo/format';

import { PERSON_MENTION_SECTIONS } from './schema';
import type { PersonBacklinks, PersonMentionRef } from './types';

const mentionedAt = (ref: PersonMentionRef): number =>
  ref.mentionedAt ? Date.parse(ref.mentionedAt) : -Infinity;

/** HTML-only selection; full backlinks remain available to Markdown and JSON. */
export const selectPersonRelatedMaterials = (
  backlinks: PersonBacklinks
): readonly PersonMentionRef[] =>
  PERSON_MENTION_SECTIONS.flatMap((section) => backlinks[section])
    .sort(
      (a, b) =>
        mentionedAt(b) - mentionedAt(a) ||
        compareRuText(a.title, b.title) ||
        compareRuText(a.section, b.section) ||
        compareRuText(a.sourceId, b.sourceId)
    )
    .slice(0, 6);
