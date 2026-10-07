import Typograf, { type TypografContext } from 'typograf';

export const TYPOGRAPHY_BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'body',
  'br',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul'
]);

export const TYPOGRAPHY_SKIP_TAGS = new Set([
  'code',
  'kbd',
  'math',
  'object',
  'pre',
  'samp',
  'script',
  'style',
  'textarea',
  'var'
]);

export const TYPOGRAPHY_WRAPPER_CLASSES = new Set([
  'nowrap-date-range',
  'typograf-oa-lquote',
  'typograf-oa-n-lquote',
  'typograf-oa-sp-lquote'
]);

const BRAND_PART_RULE = 'ru/nbsp/shelkovoPartName';

if (!Typograf.getRule(BRAND_PART_RULE)) {
  Typograf.addRule({
    name: BRAND_PART_RULE,
    // Keep brand compounds like "Шелково Ривер" on one line.
    handler: (text) => text.replace(/Шелково (?=[A-ZА-ЯЁ])/gu, 'Шелково\u00A0')
  });
}

const BEFORE_NUMBER_SIGN_RULE = 'ru/nbsp/beforeNumberSign';

if (!Typograf.getRule(BEFORE_NUMBER_SIGN_RULE)) {
  Typograf.addRule({
    name: BEFORE_NUMBER_SIGN_RULE,
    // Run before ru/nbsp/afterNumberSign inserts its narrow non-breaking space.
    index: 505,
    handler: (text) => text.replace(/(?<=[\p{L}.,;:!?)])\s+(?=№\s*\d)/gu, '\u00A0')
  });
}

const DATE_RANGE = new RegExp(
  `(?<![\\p{L}\\p{N}_])([12]\\d|3[01]|0?[1-9])[-–]([12]\\d|3[01]|0?[1-9])[ \\u00A0](${Typograf.getData('ru/monthGenCase')})(?![\\p{L}\\p{N}_])`,
  'gu'
);
const DATE_RANGE_DASH_RULE = 'ru/dash/shelkovoDateRange';
const DATE_RANGE_HTML_RULE = 'ru/html/nowrapDateRange';
const QUOTE_CONTEXT_RULE = 'ru/html/quoteContext';

function alignHtmlQuotes(text: string, context: TypografContext): string {
  if (!/[«„]/u.test(text)) {
    return text;
  }
  let result = '';
  let cursor = 0;
  let hasContent = false;
  let space: number | undefined;
  // Typograf's hidden-tag labels are inspected through its public safeTags API.
  const tokens = /\uF000tf\d+\uF000|<span class="typograf-oa-(n-)?lquote">([^<]*)<\/span>|([«„])/gu;
  for (const match of text.matchAll(tokens)) {
    const between = text.slice(cursor, match.index);
    result += between;
    if (/\n\n[ \u00A0]*$/u.test(between)) {
      hasContent = false;
    } else if (/[^\s\uF001]/u.test(between)) {
      hasContent = true;
    }
    if (between) {
      space = /[ \u00A0\n]$/u.test(between) ? result.length - 1 : undefined;
    }

    const quote = match[2] ?? match[3];
    if (quote !== undefined) {
      if (match[2] !== undefined && !match[1]) {
        // The stock rule already paired this quote with its preceding space.
        result += match[0];
      } else if (hasContent && space !== undefined) {
        result = `${result.slice(0, space)}<span class="typograf-oa-sp-lquote">${result[space]}</span>${result.slice(space + 1)}`;
        result += `<span class="typograf-oa-lquote">${quote}</span>`;
      } else {
        result += hasContent ? quote : `<span class="typograf-oa-n-lquote">${quote}</span>`;
      }
      hasContent = true;
      space = undefined;
    } else {
      const part = { ...context, text: match[0] };
      for (const group of ['html', 'own', 'url']) {
        context.safeTags.show(part, group);
      }
      const tag = part.text.match(/^<\/?([a-z][\w:-]*)/iu)?.[1]?.toLowerCase();
      if (tag && TYPOGRAPHY_BLOCK_TAGS.has(tag)) {
        hasContent = false;
        space = undefined;
      } else if (
        tag !== 'script' &&
        tag !== 'style' &&
        ((!tag && !part.text.startsWith('<!--')) ||
          (tag && (TYPOGRAPHY_SKIP_TAGS.has(tag) || tag === 'img' || tag === 'input')))
      ) {
        hasContent = true;
        space = undefined;
      }
      result += match[0];
    }
    cursor = match.index + match[0].length;
  }
  return result + text.slice(cursor);
}

if (!Typograf.getRule(QUOTE_CONTEXT_RULE)) {
  Typograf.addRule({
    name: QUOTE_CONTEXT_RULE,
    index: 1011,
    htmlAttrs: false,
    // optalign/quote (1010) treats every hidden inline tag as a line start.
    // Pair such quotes with the preceding space, keeping formatting boundaries.
    handler: (text, _settings, context) => alignHtmlQuotes(text, context)
  });
}

if (!Typograf.getRule(DATE_RANGE_DASH_RULE)) {
  Typograf.addRule({
    name: DATE_RANGE_DASH_RULE,
    // daysMonth (310) only recognizes a range after whitespace, missing quotes
    // and hidden HTML tags. Normalize those boundaries in every output mode.
    index: 315,
    handler: (text) => text.replace(DATE_RANGE, '$1–$2\u00A0$3')
  });
}

if (!Typograf.getRule(DATE_RANGE_HTML_RULE)) {
  Typograf.addRule({
    name: DATE_RANGE_HTML_RULE,
    // The html group (1210) runs after spaces, dashes, and optalign/quote (1010).
    htmlAttrs: false,
    handler: (text) => text.replace(DATE_RANGE, '<span class="nowrap-date-range">$&</span>')
  });
  Typograf.addRule({
    name: 'ru/html/unwrapTypography',
    queue: 'hide-safe-tags-html',
    htmlAttrs: false,
    // Unwrap after protected elements and comments, before ordinary HTML tags.
    // This also replaces optalign/quote's earlier start-queue cleanup, which
    // would otherwise remove quote spans from code examples.
    handler: (text) =>
      text.replace(
        /<span class="(?:nowrap-date-range|typograf-oa-(?:n-|sp-)?lquote)">([^<]*)<\/span>/gu,
        '$1'
      )
  });
}

const typograf = new Typograf({
  locale: ['ru', 'en-US'],
  processingSeparateParts: true,
  enableRule: 'ru/optalign/quote',
  ruleFilter: (rule) => rule.name !== 'ru/optalign/quote' || rule.queue !== 'start'
});

for (const tag of TYPOGRAPHY_SKIP_TAGS) {
  typograf.addSafeTag(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, 'gi'));
}

// Typograf does not decode &amp;, but its punctuation rules can split the
// semicolon from an escaped literal entity. Keep the entire spelling intact.
typograf.addSafeTag(/&amp;(?:#(?:x[\da-f]+|\d+);|[a-z][a-z\d]*;)?/gi);
// Numeric spellings of markup characters must stay text in prepared HTML too.
typograf.addSafeTag(/&#(?:0*(?:38|60|62)|x0*(?:26|3c|3e));/gi);
// Typograf's ordinary tag matcher stops at the first >, even in an attribute.
// Shield complete start tags with quoted markup before cleanup or text rules.
typograf.addSafeTag(
  /<[a-z][\w:-]*\s(?:[^"'<>]|"[^"]*"|'[^']*')*(?:"[^"]*[<>][^"]*"|'[^']*[<>][^']*')(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi
);

const escapeText = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Literal text → text, including attributes, textContent, and diff inputs. */
export const formatText = (text: string): string =>
  typograf
    .execute(escapeText(text), {
      ruleFilter: (rule) => rule.group !== 'html' && rule.htmlAttrs !== false
    })
    .replace(/&(?:lt|gt|amp);/gu, (entity) =>
      entity === '&lt;' ? '<' : entity === '&gt;' ? '>' : '&'
    );

/** Literal text → HTML containing only markup generated by typography rules. */
export const formatTextHtml = (text: string): string => typograf.execute(escapeText(text));

/** Prepared HTML → HTML. The caller owns the safety of the supplied markup. */
export const formatDynamicHtml = (html: string): string => typograf.execute(html);
