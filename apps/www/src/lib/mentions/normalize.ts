import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import {
  ENTITY_MENTION_DEFAULT_LABEL_CASE,
  isEntityMentionLabelCase,
  type EntityMentionLabelCase,
  type EntityMentionSourceEntity,
  type EntityMentionTarget,
  type NormalizedEntityMentions,
  type SiteMentionRegistry
} from './types';

const parser = unified().use(remarkParse).use(remarkGfm);
const SLUG_START = /[a-z0-9]/u;
const SLUG_CHAR = /[a-z0-9-]/u;
const CASE_CHAR = /[a-z]/u;
const BLOCKED_PREFIX = /[\p{L}\p{N}_]/u;
const ASCII_ALPHANUMERIC = /[A-Za-z0-9]/u;
const TOKEN_DELIMITER = /[\s,;!?)}\]>'"«»]/u;
const SKIPPED_NODE_TYPES = new Set([
  'code',
  'definition',
  'html',
  'image',
  'imageReference',
  'inlineCode',
  'link',
  'linkReference',
  'yaml'
]);

interface MarkdownPositionPoint {
  readonly offset?: number;
}

interface MarkdownPosition {
  readonly start?: MarkdownPositionPoint;
  readonly end?: MarkdownPositionPoint;
}

interface MarkdownNode {
  readonly type: string;
  readonly children?: readonly MarkdownNode[];
  readonly position?: MarkdownPosition;
  readonly url?: string;
}

interface MentionReplacement {
  readonly start: number;
  readonly end: number;
  readonly markdown: string;
  readonly target: EntityMentionTarget;
}

const escapeLinkText = (value: string): string => value.replace(/([\\\[\]])/gu, '\\$1');

const escapeLinkTitle = (value: string): string => value.replace(/([\\"])/gu, '\\$1');

const entityKey = (target: EntityMentionTarget): string => `${target.type}:${target.slug}`;

const sourceEntityKey = (source: EntityMentionSourceEntity): string =>
  `${source.type}:${source.slug}`;

const token = (segment: string, start: number): string => {
  let end = start + 1;

  while (end < segment.length && !TOKEN_DELIMITER.test(segment[end])) {
    end += 1;
  }

  return segment.slice(start, end);
};

const failMention = (context: string, message: string): never => {
  throw new Error(`${context} ${message}`);
};

const validateNotSelfMention = (
  target: EntityMentionTarget,
  source: EntityMentionSourceEntity | undefined,
  context: string
): void => {
  if (source && entityKey(target) === sourceEntityKey(source)) {
    failMention(context, `contains self entity mention "${entityKey(target)}"`);
  }
};

const mentionLabel = (
  target: EntityMentionTarget,
  labelCase: EntityMentionLabelCase,
  context: string
): string => {
  if (labelCase === ENTITY_MENTION_DEFAULT_LABEL_CASE) {
    return target.label;
  }

  const label = target.labelCases?.[labelCase];

  return (
    label ??
    failMention(
      context,
      `contains entity mention "@${target.slug}:${labelCase}", but entity "${entityKey(target)}" has no "${labelCase}" label case`
    )
  );
};

const mentionLink = (
  target: EntityMentionTarget,
  labelCase: EntityMentionLabelCase,
  context: string
): string => {
  const titlePart = target.linkTitle ? ` "${escapeLinkTitle(target.linkTitle)}"` : '';

  return `[${escapeLinkText(mentionLabel(target, labelCase, context))}](${target.htmlUrl}${titlePart})`;
};

const absoluteOffsets = (
  node: MarkdownNode,
  context: string
): {
  readonly start: number;
  readonly end: number;
} => {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;

  if (start === undefined || end === undefined) {
    throw new Error(`${context} is missing markdown source offsets`);
  }

  return { start, end };
};

function collectTextNodes(
  node: MarkdownNode,
  context: string
): readonly {
  readonly node: MarkdownNode;
  readonly start: number;
  readonly end: number;
}[] {
  if (SKIPPED_NODE_TYPES.has(node.type)) {
    return [];
  }

  if (node.type === 'text') {
    const { start, end } = absoluteOffsets(node, context);

    return [{ node, start, end }];
  }

  return (node.children ?? []).flatMap((child) => collectTextNodes(child, context));
}

const labelledMentionSlug = (url: string, context: string): string | undefined => {
  if (url[0] !== '@') {
    return undefined;
  }

  if (url.includes('%')) {
    failMention(
      context,
      `contains unsupported encoded labelled entity mention destination "${url}"`
    );
  }

  const slug = url.slice(1);

  for (let index = 0; index < slug.length; index += 1) {
    if (slug[index] === ':' && index > 0 && CASE_CHAR.test(slug[index + 1] ?? '')) {
      failMention(
        context,
        `contains unsupported labelled entity mention "@${slug}"; write the needed grammar in the visible link text`
      );
    }
  }

  return slug.length > 0 &&
    SLUG_START.test(slug[0] ?? '') &&
    [...slug].every((char) => SLUG_CHAR.test(char))
    ? slug
    : undefined;
};

const decodeUriComponentSafe = (value: string): string | undefined => {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
};

const rawUnwrappedLinkDestinationEnd = (source: string, destinationStart: number): number => {
  let parenDepth = 0;

  for (let index = destinationStart; index < source.length; index += 1) {
    const char = source[index];

    if (char === '\\') {
      index += 1;
      continue;
    }

    if (/\s/u.test(char)) {
      return index;
    }

    if (char === '(') {
      parenDepth += 1;
      continue;
    }

    if (char === ')') {
      if (parenDepth === 0) {
        return index;
      }

      parenDepth -= 1;
    }
  }

  return source.length;
};

const rawLinkDestinationEnd = (
  source: string,
  destinationStart: number,
  isAngleWrapped: boolean,
  url: string,
  context: string
): number => {
  if (source.startsWith(url, destinationStart)) {
    return destinationStart + url.length;
  }

  const rawEnd = isAngleWrapped
    ? source.indexOf('>', destinationStart)
    : rawUnwrappedLinkDestinationEnd(source, destinationStart);

  if (rawEnd === -1) {
    throw new Error(`${context} contains a labelled entity mention with unsupported link syntax`);
  }

  const rawUrl = source.slice(destinationStart, rawEnd);

  if (decodeUriComponentSafe(rawUrl) === url) {
    return rawEnd;
  }

  throw new Error(
    `${context} contains a labelled entity mention with unsupported link destination boundaries`
  );
};

const linkDestinationOffsets = (
  markdown: string,
  node: MarkdownNode,
  context: string
): {
  readonly start: number;
  readonly end: number;
} => {
  const { start, end } = absoluteOffsets(node, context);
  const source = markdown.slice(start, end);
  const destinationStartMarker = source.lastIndexOf('](');

  if (destinationStartMarker === -1) {
    throw new Error(`${context} contains a labelled entity mention with unsupported link syntax`);
  }

  const destinationStart = destinationStartMarker + 2;
  const isAngleWrapped = source[destinationStart] === '<';
  const sourceUrlStart = destinationStart + (isAngleWrapped ? 1 : 0);
  const urlStart = start + sourceUrlStart;
  const url = node.url ?? '';

  return {
    start: urlStart,
    end: start + rawLinkDestinationEnd(source, sourceUrlStart, isAngleWrapped, url, context)
  };
};

function collectLabelledMentionReplacements(
  node: MarkdownNode,
  markdown: string,
  context: string,
  registry: SiteMentionRegistry
): readonly MentionReplacement[] {
  if (SKIPPED_NODE_TYPES.has(node.type) && node.type !== 'link') {
    return [];
  }

  if (node.type === 'link' && node.url !== undefined) {
    const slug = labelledMentionSlug(node.url, context);

    if (slug === undefined) {
      return [];
    }

    const target =
      registry.get(slug) ?? failMention(context, `contains unknown entity mention "@${slug}"`);

    return [
      {
        ...linkDestinationOffsets(markdown, node, context),
        markdown: target.htmlUrl,
        target
      }
    ];
  }

  return (node.children ?? []).flatMap((child) =>
    collectLabelledMentionReplacements(child, markdown, context, registry)
  );
}

const invalidMentionTail = (tail: string | undefined, next: string | undefined) =>
  tail === '_' ||
  tail === '/' ||
  tail === '@' ||
  tail === '\\' ||
  tail === '-' ||
  (tail === ':' && next !== undefined && !/\s/u.test(next)) ||
  (tail !== undefined && BLOCKED_PREFIX.test(tail)) ||
  (tail === '.' && next !== undefined && ASCII_ALPHANUMERIC.test(next));

const mentionCase = (
  segment: string,
  mentionStart: number,
  slugEnd: number,
  context: string
): {
  readonly labelCase: EntityMentionLabelCase;
  readonly end: number;
} => {
  if (segment[slugEnd] !== ':' || !CASE_CHAR.test(segment[slugEnd + 1] ?? '')) {
    return {
      labelCase: ENTITY_MENTION_DEFAULT_LABEL_CASE,
      end: slugEnd
    };
  }

  let end = slugEnd + 1;

  while (end < segment.length && CASE_CHAR.test(segment[end])) {
    end += 1;
  }

  const labelCase = segment.slice(slugEnd + 1, end);

  if (isEntityMentionLabelCase(labelCase)) {
    return {
      labelCase,
      end
    };
  }

  return failMention(context, `contains invalid entity mention "${token(segment, mentionStart)}"`);
};

function mentionReplacements(
  segment: string,
  absoluteStart: number,
  context: string,
  registry: SiteMentionRegistry
): readonly MentionReplacement[] {
  const replacements: MentionReplacement[] = [];

  for (let index = 0; index < segment.length; index += 1) {
    if (segment[index] !== '@') {
      continue;
    }

    const previous = index > 0 ? segment[index - 1] : undefined;

    if (
      previous === '\\' ||
      previous === '/' ||
      (previous !== undefined && BLOCKED_PREFIX.test(previous))
    ) {
      continue;
    }

    const start = index + 1;
    const head = segment[start];

    if (!head) {
      failMention(context, 'contains empty entity mention "@"');
    }

    if (!SLUG_START.test(head)) {
      failMention(context, `contains invalid entity mention "${token(segment, index)}"`);
    }

    let end = start;

    while (end < segment.length && SLUG_CHAR.test(segment[end])) {
      end += 1;
    }

    const slug = segment.slice(start, end);
    const labelCase = mentionCase(segment, index, end, context);
    const tail = segment[labelCase.end];
    const next = segment[labelCase.end + 1];

    if (invalidMentionTail(tail, next)) {
      failMention(context, `contains invalid entity mention "${token(segment, index)}"`);
    }

    const target =
      registry.get(slug) ?? failMention(context, `contains unknown entity mention "@${slug}"`);

    replacements.push({
      start: absoluteStart + index,
      end: absoluteStart + labelCase.end,
      markdown: mentionLink(target, labelCase.labelCase, context),
      target
    });

    index = labelCase.end - 1;
  }

  return replacements;
}

export const createSiteMentionRegistry = (
  targets: readonly EntityMentionTarget[]
): SiteMentionRegistry => {
  const registry = new Map<string, EntityMentionTarget>();

  for (const target of targets) {
    if (registry.has(target.slug)) {
      throw new Error(`duplicate entity mention slug "${target.slug}"`);
    }

    registry.set(target.slug, target);
  }

  return registry;
};

export const normalizeEntityMentions = (input: {
  readonly markdown: string;
  readonly context: string;
  readonly registry: SiteMentionRegistry;
  readonly sourceEntity?: EntityMentionSourceEntity;
}): NormalizedEntityMentions => {
  if (!input.markdown.includes('@')) {
    return {
      markdown: input.markdown,
      mentions: []
    };
  }

  const tree = parser.parse(input.markdown) as MarkdownNode;
  const replacements = [
    ...collectTextNodes(tree, input.context).flatMap(({ start, end }) =>
      mentionReplacements(input.markdown.slice(start, end), start, input.context, input.registry)
    ),
    ...collectLabelledMentionReplacements(tree, input.markdown, input.context, input.registry)
  ].sort((a, b) => a.start - b.start || a.end - b.end);

  if (replacements.length === 0) {
    return {
      markdown: input.markdown,
      mentions: []
    };
  }

  let cursor = 0;
  let markdown = '';
  const mentions = new Map<string, EntityMentionTarget>();

  for (const replacement of replacements) {
    validateNotSelfMention(replacement.target, input.sourceEntity, input.context);

    markdown += `${input.markdown.slice(cursor, replacement.start)}${replacement.markdown}`;
    cursor = replacement.end;

    if (!mentions.has(entityKey(replacement.target))) {
      mentions.set(entityKey(replacement.target), replacement.target);
    }
  }

  markdown += input.markdown.slice(cursor);

  return {
    markdown,
    mentions: [...mentions.values()]
  };
};
