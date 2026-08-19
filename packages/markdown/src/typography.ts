import Typograf from 'typograf';
import type { HastPluginDefinition } from 'satteri';

interface HastNode {
  readonly type: string;
  readonly tagName?: string;
  value?: string;
  readonly children?: readonly HastNode[];
}

const TYPOGRAPHY_SKIP_TAGS = new Set([
  'code',
  'kbd',
  'math',
  'pre',
  'samp',
  'script',
  'style',
  'textarea',
]);

const BRAND_PART_RULE = 'ru/nbsp/shelkovoPartName';

if (!Typograf.getRule(BRAND_PART_RULE)) {
  Typograf.addRule({
    name: BRAND_PART_RULE,
    // Keep brand compounds like "Шелково Ривер" on one line.
    handler: (text) => text.replace(/Шелково (?=[A-ZА-ЯЁ])/gu, 'Шелково\u00A0'),
  });
}

const BEFORE_NUMBER_SIGN_RULE = 'ru/nbsp/beforeNumberSign';

if (!Typograf.getRule(BEFORE_NUMBER_SIGN_RULE)) {
  Typograf.addRule({
    name: BEFORE_NUMBER_SIGN_RULE,
    // Run before Typograf's own ru/nbsp/afterNumberSign so the narrow
    // non-breaking space it inserts between "№" and the digit does not block
    // this rule.
    index: 505,
    // Keep a word before a number sign and its number on the same line,
    // e.g. "Приложение №1" or "п. № 1".
    handler: (text) =>
      text.replace(/(?<=[\p{L}.,;:!?)])\s+(?=№\s*\d)/gu, '\u00A0'),
  });
}

const typograf = new Typograf({
  locale: ['ru', 'en-US'],
  processingSeparateParts: true,
});

function safeTagPattern(tag: string): RegExp {
  return new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, 'gi');
}

for (const tag of TYPOGRAPHY_SKIP_TAGS) {
  typograf.addSafeTag(safeTagPattern(tag));
}

const hasText = (value: string): boolean => /\S/u.test(value);

function formatTextNode(value: string): string {
  const withoutPrefix = value.trimStart();
  const core = withoutPrefix.trimEnd();
  const prefix = value.slice(0, value.length - withoutPrefix.length);
  const suffix = withoutPrefix.slice(core.length);

  return core ? `${prefix}${typograf.execute(core)}${suffix}` : value;
}

function visitText(node: HastNode, readonlyParents: readonly string[]): void {
  if (node.type === 'text' && typeof node.value === 'string') {
    if (
      readonlyParents.some((tag) => TYPOGRAPHY_SKIP_TAGS.has(tag)) ||
      !hasText(node.value)
    ) {
      return;
    }

    node.value = formatTextNode(node.value);
    return;
  }

  if (!node.children || node.children.length === 0) {
    return;
  }

  const parents =
    typeof node.tagName === 'string'
      ? [...readonlyParents, node.tagName.toLowerCase()]
      : readonlyParents;

  for (const child of node.children) {
    visitText(child, parents);
  }
}

/**
 * Rehype plugin for typography inside markdown/HTML AST text nodes.
 * Exported for framework markdown pipelines, for example Astro config.
 */
export function rehypeTypograf() {
  return (tree: HastNode): void => {
    visitText(tree, []);
  };
}

export const satteriTypograf = (): HastPluginDefinition => ({
  name: 'shelkovo-typograf',
  text(node, ctx) {
    if (!hasText(node.value)) {
      return;
    }

    let parent = ctx.parent(node);
    while (parent) {
      if (
        'tagName' in parent &&
        typeof parent.tagName === 'string' &&
        TYPOGRAPHY_SKIP_TAGS.has(parent.tagName.toLowerCase())
      ) {
        return;
      }

      const nextParent = ctx.parent(parent);
      if (!nextParent) {
        break;
      }

      parent = nextParent;
    }

    ctx.setProperty(node, 'value', formatTextNode(node.value));
  },
});

export const formatDynamicHtml = (html: string): string =>
  typograf.execute(html);
