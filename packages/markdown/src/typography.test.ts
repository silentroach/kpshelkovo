// @vitest-environment happy-dom

import { formatDynamicHtml } from '@shelkovo/typography';
import rehypeStringify from 'rehype-stringify';
import { htmlToHast, markdownToHtml } from 'satteri';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';

import { rehypeTypograf, satteriTypograf } from './index';

const showNbsp = (value: string): string =>
  value.replaceAll('\u00A0', '·').replaceAll('\u202F', '·');

const dom = (html: string): HTMLDivElement => {
  const element = document.createElement('div');
  element.innerHTML = html;
  return element;
};

const rehypeHtml = (html: string, passes = 1): string => {
  const tree = htmlToHast(html, { fragment: true });
  if (tree.type !== 'root') {
    throw new Error('Expected HTML fragment root');
  }
  for (let pass = 0; pass < passes; pass += 1) {
    rehypeTypograf()(tree);
  }
  const processor = unified().use(rehypeStringify);
  // The installed Satteri and rehype resolve different patch releases of @types/hast.
  return processor.stringify(tree as Parameters<typeof processor.stringify>[0]);
};

const satteriHtml = async (html: string, passes = 1): Promise<string> => {
  const result = await markdownToHtml(html, {
    features: { rawHtml: true },
    hastPlugins: Array.from({ length: passes }, () => satteriTypograf())
  });
  return result.html.trim();
};

describe('shared typography AST adapter', () => {
  it('preserves ordinary quotes and spaces in strong and links without extra wrappers', async () => {
    const source =
      '<p>сообщение <strong>«Оформление пропуска недоступно»</strong>. Позже <a href="/help/">«Личный помощник» ответил</a>.</p>';
    const html = formatDynamicHtml(source);
    const expected = dom(html).innerHTML;
    expect(expected).toMatchInlineSnapshot(
      `"<p>сообщение <strong>«Оформление пропуска недоступно»</strong>. Позже <a href="/help/">«Личный помощник» ответил</a>.</p>"`
    );
    expect(dom(rehypeHtml(source)).innerHTML).toBe(expected);
    expect(dom(await satteriHtml(source)).innerHTML).toBe(expected);
    expect(formatDynamicHtml(html)).toBe(html);
    expect(dom(rehypeHtml(source, 2)).innerHTML).toBe(expected);
    expect(dom(await satteriHtml(source, 2)).innerHTML).toBe(expected);
  });

  it('matches the HTML path inside complete emphasis and links', async () => {
    const source =
      '<p>Начало <strong>8-10 октября</strong>, затем <a href="/events/" title="8-10 октября">«8-10 октября»</a>.</p>';
    const expected = dom(formatDynamicHtml(source)).innerHTML;
    expect(dom(expected).querySelector('a')?.innerHTML).toMatchInlineSnapshot(
      `"«<span class="nowrap-date-range">8–10&nbsp;октября</span>»"`
    );
    expect(dom(rehypeHtml(source)).innerHTML).toBe(expected);
    expect(dom(await satteriHtml(source)).innerHTML).toBe(expected);
  });

  it('preserves whitespace and literal text while inserting multiple sibling nodes', async () => {
    const source =
      '<p>  &lt;em&gt; &amp;copy; «8-10 октября» \t\n<strong>слово</strong>\n  конец  </p>';
    const rehype = dom(rehypeHtml(source));
    const satteri = dom(await satteriHtml(source));
    expect(showNbsp(rehype.innerHTML).replaceAll('\t', '→')).toMatchInlineSnapshot(`
      "<p>  &lt;em&gt; &amp;copy; «<span class="nowrap-date-range">8–10&nbsp;октября</span>» →
      <strong>слово</strong>
        конец  </p>"
    `);
    expect(satteri.innerHTML).toBe(rehype.innerHTML);
    expect(rehype.querySelector('em')).toBeNull();
  });

  it('keeps a long whitespace-only prefix and trailing whitespace exactly', async () => {
    const source = `<p>${' '.repeat(50_000)}8-10 октября\t\n</p>`;
    const expected = `${' '.repeat(50_000)}8–10\u00A0октября\t\n`;
    expect(dom(rehypeHtml(source)).textContent).toBe(expected);
    expect(dom(await satteriHtml(source)).textContent).toBe(expected);
  });

  it('skips code and other protected parents in both AST pipelines', async () => {
    const source =
      '<p><code>«8-10 октября»</code> <kbd>8-10 октября</kbd> <textarea>8-10 октября &amp;copy;</textarea> <span>8-10 октября</span></p>';
    const expected = dom(formatDynamicHtml(source)).innerHTML;
    expect(dom(rehypeHtml(source)).innerHTML).toBe(expected);
    expect(dom(await satteriHtml(source)).innerHTML).toBe(expected);
  });

  it('does not join dates across emphasis or link boundaries', async () => {
    const source = '<p><em>8–</em>10 октября, <a href="/">8–10</a> октября</p>';
    expect(rehypeHtml(source)).not.toContain('nowrap-date-range');
    expect(await satteriHtml(source)).not.toContain('nowrap-date-range');
  });

  it('skips generated wrappers on consecutive passes without losing surrounding text', async () => {
    const source = '<p>Программа «8-10 октября» (день, вечер). <strong>«8-10 ноября»</strong></p>';
    const once = dom(rehypeHtml(source)).innerHTML;
    expect(dom(rehypeHtml(source, 2)).innerHTML).toBe(once);
    expect(dom(await satteriHtml(source, 2)).innerHTML).toBe(once);
    expect(dom(formatDynamicHtml(once)).innerHTML).toBe(once);
    expect(dom(once).querySelector('.nowrap-date-range .nowrap-date-range')).toBeNull();
  });
});
