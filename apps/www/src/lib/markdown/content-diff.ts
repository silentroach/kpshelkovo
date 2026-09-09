import { formatDynamicHtml } from '@shelkovo/markdown';
import {
  diffLines,
  diffWords,
  type Change,
  type DiffLinesOptionsNonabortable,
  type DiffWordsOptionsNonabortable
} from 'diff';

interface ContentDiffSource {
  readonly removed: string;
  readonly added: string;
}

interface ContentDiffSegment {
  readonly value: string;
  readonly changed: boolean;
}

type ContentDiffSide = 'removed' | 'added';
type ContentDiffMode = 'inline' | 'block';
type ContentDiffModePreference = ContentDiffMode | 'auto';

const CHANGE_BLOCK =
  /<pre><code class="language-(change(?:-(inline|block))?)"(?: data-meta="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/gu;
const CHANGE_FENCE_INFO = /^(```|~~~)change\s+(inline|block)\s*$/gmu;
const BLOCK_MIN_TEXT_WEIGHT = 140;
const BLOCK_CHANGED_RATIO = 0.5;
const BLOCK_CHANGED_RUNS = 10;
const BLOCK_LOW_COMMON_RATIO = 0.36;
const LINE_ANCHOR_RATIO = 0.66;
const LINE_ANCHOR_MIN_COUNT = 2;
const LINE_ANCHOR_SIMILARITY = 0.7;

const HTML_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  gt: '>',
  lt: '<',
  quot: '"',
  apos: "'"
};

type SegmenterConstructor = new (
  locale: string,
  options: { readonly granularity: 'word' }
) => unknown;

type IntlWithSegmenter = typeof Intl & {
  readonly Segmenter?: SegmenterConstructor;
};

const Segmenter = (Intl as IntlWithSegmenter).Segmenter;
const RUSSIAN_WORD_SEGMENTER = Segmenter ? new Segmenter('ru', { granularity: 'word' }) : undefined;

const WORD_DIFF_OPTIONS: DiffWordsOptionsNonabortable = {
  ignoreCase: true,
  intlSegmenter: RUSSIAN_WORD_SEGMENTER
};

const LINE_DIFF_OPTIONS: DiffLinesOptionsNonabortable = {
  ignoreWhitespace: true
};
const MONEY_COMMON_SUFFIX = /^((?:[^\S\n]+\d{3})*[^\S\n]*(?:руб\.?|₽)(?![\p{Letter}\p{Number}]))/iu;
const MONEY_TRAILING_PUNCTUATION = /^[.!?]/u;
const TRAILING_NUMBER = /\d\s*$/u;

const entityCodePoint = (entity: string): number | undefined => {
  const value =
    entity.startsWith('#x') || entity.startsWith('#X')
      ? Number.parseInt(entity.slice(2), 16)
      : Number.parseInt(entity.slice(1), 10);

  return Number.isFinite(value) && value >= 0 && value <= 0x10ffff ? value : undefined;
};

const decodeEntity = (entity: string): string => {
  if (entity.startsWith('#')) {
    const codePoint = entityCodePoint(entity);

    return codePoint !== undefined ? String.fromCodePoint(codePoint) : `&${entity};`;
  }

  return HTML_ENTITIES[entity] ?? `&${entity};`;
};

const decodeHtml = (value: string): string =>
  value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/giu, (_, entity: string) => decodeEntity(entity));

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/gu, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });

const normalizeBlockText = (value: string): string => value.replace(/\r\n?/gu, '\n').trim();

const typographText = (value: string): string => decodeHtml(formatDynamicHtml(escapeHtml(value)));

const textWeight = (value: string): number => value.replace(/[^\p{Letter}\p{Number}]/gu, '').length;

const isHighlightableChange = (value: string): boolean => /[\p{Letter}\p{Number}]/u.test(value);

const hasTrailingNumber = (value: string): boolean => TRAILING_NUMBER.test(value);

const typographContentDiffSource = (source: ContentDiffSource): ContentDiffSource => ({
  removed: typographText(source.removed),
  added: typographText(source.added)
});

const mergeMoneySuffixChanges = (changes: readonly Change[]): readonly Change[] => {
  const merged: Change[] = [];

  for (let index = 0; index < changes.length; index += 1) {
    const removed = changes[index];
    const added = changes[index + 1];
    const common = changes[index + 2];

    if (
      removed?.removed &&
      added?.added &&
      common &&
      !common.added &&
      !common.removed &&
      hasTrailingNumber(removed.value) &&
      hasTrailingNumber(added.value)
    ) {
      const suffix = common.value.match(MONEY_COMMON_SUFFIX)?.[1];

      if (suffix) {
        const next = changes[index + 3];
        const addedPunctuation = next?.added
          ? (next.value.match(MONEY_TRAILING_PUNCTUATION)?.[0] ?? '')
          : '';

        merged.push({
          ...removed,
          value: removed.value + suffix
        });
        merged.push({
          ...added,
          value: added.value + suffix + addedPunctuation
        });

        const remainingCommon = common.value.slice(suffix.length);

        if (remainingCommon) {
          merged.push({
            ...common,
            value: remainingCommon
          });
        }

        if (addedPunctuation && next) {
          const remainingNext = next.value.slice(addedPunctuation.length);

          if (remainingNext) {
            merged.push({
              ...next,
              value: remainingNext
            });
          }

          index += 3;
          continue;
        }

        index += 2;
        continue;
      }
    }

    merged.push(removed);
  }

  return merged;
};

const textLines = (value: string): readonly string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const lineAnchorText = (line: string): string =>
  line
    .split(/\s+[—–-]\s+/u)[0]
    .toLowerCase()
    .replace(/ё/gu, 'е')
    .replace(/[\p{Number}\p{Punctuation}\p{Symbol}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

const lineAnchorTokens = (line: string): readonly string[] =>
  lineAnchorText(line)
    .split(' ')
    .filter((token) => token.length > 1);

const lineAnchorSimilarity = (left: readonly string[], right: readonly string[]): number => {
  if (!left.length || !right.length) {
    return 0;
  }

  const rightTokens = new Set(right);
  const common = left.filter((token) => rightTokens.has(token)).length;

  return common / Math.min(left.length, right.length);
};

const hasStableLineAnchors = (source: ContentDiffSource): boolean => {
  const removed = textLines(source.removed).map(lineAnchorTokens);
  const added = textLines(source.added).map(lineAnchorTokens);

  if (removed.length < LINE_ANCHOR_MIN_COUNT || added.length < LINE_ANCHOR_MIN_COUNT) {
    return false;
  }

  const matched = removed.filter((line) =>
    added.some((candidate) => lineAnchorSimilarity(line, candidate) >= LINE_ANCHOR_SIMILARITY)
  ).length;

  return matched >= LINE_ANCHOR_MIN_COUNT && matched / removed.length >= LINE_ANCHOR_RATIO;
};

const isContentDiffMode = (value?: string): value is ContentDiffMode =>
  value === 'inline' || value === 'block';

const contentDiffMode = (classMode?: string, meta?: string): ContentDiffModePreference => {
  if (isContentDiffMode(classMode)) {
    return classMode;
  }

  return meta?.split(/\s+/u).find(isContentDiffMode) ?? 'auto';
};

const stripDiffMarker = (line: string): readonly [ContentDiffSide, string] | undefined => {
  const sign = line[0];

  if (sign !== '-' && sign !== '+') {
    return undefined;
  }

  const text = line[1] === ' ' ? line.slice(2) : line.slice(1);

  return sign === '-' ? ['removed', text] : ['added', text];
};

const parseContentDiffSource = (source: string): ContentDiffSource | undefined => {
  const lines = decodeHtml(source).replace(/\r\n?/gu, '\n').trimEnd().split('\n');
  const removed: string[] = [];
  const added: string[] = [];
  let side: ContentDiffSide | undefined;

  for (const line of lines) {
    const marked = stripDiffMarker(line);

    if (marked) {
      [side] = marked;
      const [, text] = marked;
      (side === 'removed' ? removed : added).push(text);
      continue;
    }

    if (!side && line.trim().length === 0) {
      continue;
    }

    if (!side) {
      return undefined;
    }

    (side === 'removed' ? removed : added).push(line);
  }

  const removedText = normalizeBlockText(removed.join('\n'));
  const addedText = normalizeBlockText(added.join('\n'));

  if (!removedText || !addedText) {
    return undefined;
  }

  return {
    removed: removedText,
    added: addedText
  };
};

const renderTextSegment = (value: string, side: ContentDiffSide): string => {
  const tag = side === 'removed' ? 'del' : 'ins';

  return `<${tag} class="ui-content-diff__change ui-content-diff__change--${side}">${escapeHtml(value)}</${tag}>`;
};

const renderSegment = (segment: ContentDiffSegment, side: ContentDiffSide): string =>
  segment.changed && isHighlightableChange(segment.value)
    ? renderTextSegment(segment.value, side)
    : escapeHtml(segment.value);

const isBridgeSpace = (
  segment: ContentDiffSegment,
  previous?: ContentDiffSegment,
  next?: ContentDiffSegment
): boolean => /^\s+$/u.test(segment.value) && Boolean(previous?.changed && next?.changed);

const mergeSegments = (segments: readonly ContentDiffSegment[]): readonly ContentDiffSegment[] => {
  const merged: ContentDiffSegment[] = [];

  for (const segment of segments) {
    const previous = merged[merged.length - 1];

    if (previous && previous.changed === segment.changed) {
      merged[merged.length - 1] = {
        value: previous.value + segment.value,
        changed: previous.changed
      };
      continue;
    }

    merged.push(segment);
  }

  return merged;
};

const sameFoldedText = (left: string, right: string): boolean =>
  left.toLocaleLowerCase('ru') === right.toLocaleLowerCase('ru');

const comparableText = (value: string): string =>
  value.toLocaleLowerCase('ru').replace(/\s+/gu, ' ').trim();

const sourceSegmentValue = (sourceText: string, cursor: number, target: string): string => {
  const candidate = sourceText.slice(cursor, cursor + target.length);

  if (sameFoldedText(candidate, target)) {
    return candidate;
  }

  const comparableTarget = comparableText(target);

  if (!comparableTarget) {
    return sourceText.slice(cursor).match(/^\s+/u)?.[0] ?? target;
  }

  for (let end = cursor; end <= sourceText.length; end += 1) {
    const sourceCandidate = sourceText.slice(cursor, end);

    if (comparableText(sourceCandidate) === comparableTarget) {
      return sourceCandidate;
    }
  }

  return target;
};

const sideSegments = (
  changes: readonly Change[],
  sourceText: string,
  side: ContentDiffSide
): readonly ContentDiffSegment[] => {
  let cursor = 0;
  const segments = changes.flatMap((change) => {
    if (side === 'removed' && change.added) {
      return [];
    }

    if (side === 'added' && change.removed) {
      return [];
    }

    const changed = (side === 'removed' && change.removed) || (side === 'added' && change.added);
    const value = sourceSegmentValue(sourceText, cursor, change.value);
    cursor += value.length;

    return [
      {
        value,
        changed
      }
    ];
  });

  return mergeSegments(
    segments.map((segment, index) => ({
      value: segment.value,
      changed: segment.changed || isBridgeSpace(segment, segments[index - 1], segments[index + 1])
    }))
  );
};

const renderSideText = (
  changes: readonly Change[],
  sourceText: string,
  side: ContentDiffSide
): string =>
  sideSegments(changes, sourceText, side)
    .map((segment) => renderSegment(segment, side))
    .join('');

const changedTextWeight = (changes: readonly Change[]): number =>
  changes.reduce(
    (sum, change) => (change.added || change.removed ? sum + textWeight(change.value) : sum),
    0
  );

const commonTextWeight = (changes: readonly Change[]): number =>
  changes.reduce(
    (sum, change) => (change.added || change.removed ? sum : sum + textWeight(change.value)),
    0
  );

const changedRuns = (changes: readonly Change[]): number =>
  changes.filter(
    (change) => (change.added || change.removed) && isHighlightableChange(change.value)
  ).length;

const hasUnevenLineReplacement = (
  source: ContentDiffSource,
  lineChanges: readonly Change[]
): boolean => {
  const removedLineCount = textLines(source.removed).length;
  const addedLineCount = textLines(source.added).length;

  if (removedLineCount === addedLineCount) {
    return false;
  }

  const changedLineCount = lineChanges.reduce(
    (sum, change) => (change.added || change.removed ? sum + textLines(change.value).length : sum),
    0
  );

  return changedLineCount > 1;
};

const autoContentDiffMode = (
  source: ContentDiffSource,
  changes: readonly Change[],
  lineChanges: readonly Change[]
): ContentDiffMode => {
  const maxTextWeight = Math.max(textWeight(source.removed), textWeight(source.added));

  if (hasStableLineAnchors(source)) {
    return 'inline';
  }

  if (hasUnevenLineReplacement(source, lineChanges)) {
    return 'block';
  }

  const changedWeight = changedTextWeight(changes);
  const commonWeight = commonTextWeight(changes);
  const totalWeight = changedWeight + commonWeight;
  const changedRatio = totalWeight > 0 ? changedWeight / totalWeight : 0;
  const commonRatio = totalWeight > 0 ? commonWeight / totalWeight : 0;

  if (changedRatio >= BLOCK_CHANGED_RATIO || commonRatio <= BLOCK_LOW_COMMON_RATIO) {
    return 'block';
  }

  if (maxTextWeight < BLOCK_MIN_TEXT_WEIGHT) {
    return 'inline';
  }

  return changedRuns(changes) >= BLOCK_CHANGED_RUNS ? 'block' : 'inline';
};

const resolvedContentDiffMode = (
  preference: ContentDiffModePreference,
  source: ContentDiffSource,
  changes: readonly Change[],
  lineChanges: readonly Change[]
): ContentDiffMode =>
  preference === 'auto' ? autoContentDiffMode(source, changes, lineChanges) : preference;

const renderFullSideText = (value: string): string => escapeHtml(value);

export const normalizeContentDiffMarkdown = (markdown: string): string =>
  markdown.replace(CHANGE_FENCE_INFO, '$1change-$2');

const renderContentDiff = (
  source: ContentDiffSource,
  preference: ContentDiffModePreference
): string => {
  const visibleSource = typographContentDiffSource(source);
  const changes = mergeMoneySuffixChanges(
    diffWords(visibleSource.removed, visibleSource.added, WORD_DIFF_OPTIONS)
  );
  const lineChanges = diffLines(visibleSource.removed, visibleSource.added, LINE_DIFF_OPTIONS);
  const mode = resolvedContentDiffMode(preference, visibleSource, changes, lineChanges);
  const removedHtml =
    mode === 'inline'
      ? renderSideText(changes, visibleSource.removed, 'removed')
      : renderFullSideText(visibleSource.removed);
  const addedHtml =
    mode === 'inline'
      ? renderSideText(changes, visibleSource.added, 'added')
      : renderFullSideText(visibleSource.added);

  return `<section class="ui-content-diff ui-content-diff--${mode}" aria-label="Изменение текста">
  <div class="ui-content-diff__side ui-content-diff__side--removed">
    <p class="ui-content-diff__label"><span aria-hidden="true">−</span> Было</p>
    <p class="ui-content-diff__text">${removedHtml}</p>
  </div>
  <div class="ui-content-diff__side ui-content-diff__side--added">
    <p class="ui-content-diff__label"><span aria-hidden="true">+</span> Стало</p>
    <p class="ui-content-diff__text">${addedHtml}</p>
  </div>
</section>`;
};

export const renderContentDiffBlocks = (html: string): string =>
  html.replace(
    CHANGE_BLOCK,
    (
      block: string,
      _language: string,
      classMode: string | undefined,
      meta: string | undefined,
      source: string
    ) => {
      const parsed = parseContentDiffSource(source);

      return parsed ? renderContentDiff(parsed, contentDiffMode(classMode, meta)) : block;
    }
  );
