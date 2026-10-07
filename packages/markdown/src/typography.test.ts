// @vitest-environment happy-dom

import { formatText } from '@shelkovo/markdown/typography';
import rehypeStringify from 'rehype-stringify';
import { htmlToHast, markdownToHtml } from 'satteri';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';

import { formatDynamicHtml, formatTextHtml, rehypeTypograf, satteriTypograf } from './index';

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

describe('typography output contracts', () => {
  it('keeps ordinary typography in text output without HTML wrappers', () => {
    const output = formatText('«8-10 октября» в Шелково Ривер, Приложение №1');
    expect(showNbsp(output)).toMatchInlineSnapshot(
      `"«8–10·октября» в·Шелково·Ривер, Приложение·№·1"`
    );
    expect(output).not.toContain('<span');
    expect(formatText(output)).toBe(output);
  });

  it('preserves literal tags, ampersands, and entity spellings in both text inputs', () => {
    const source = '<em title="x">текст</em> &copy; &lt; &#60; &#x3c; &amp; &amp;lt; & x < y';
    const html = formatTextHtml(source);
    const element = dom(html);
    expect(element.children).toHaveLength(0);
    expect(showNbsp(element.textContent)).toMatchInlineSnapshot(
      `"<em title="x">текст</em> &copy; &lt; &#60; &#x3c; &amp; &amp;lt; & x·< y"`
    );
    expect(element.textContent).toBe(formatText(source));
    expect(formatDynamicHtml(html)).toBe(html);
  });

  it('only creates typography elements from literal text containing markup', () => {
    const source = '<img src=x onerror="alert(1)"> «8-10 октября» &quot;';
    const element = dom(formatTextHtml(source));
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelectorAll('span.nowrap-date-range')).toHaveLength(1);
    expect(showNbsp(element.innerHTML)).toMatchInlineSnapshot(
      `"&lt;img src=x onerror="alert(1)"&gt;<span class="typograf-oa-sp-lquote"> </span><span class="typograf-oa-lquote">«</span><span class="nowrap-date-range">8–10&nbsp;октября</span>» &amp;quot;"`
    );
    expect(element.textContent).not.toMatch(/[\u2060\u200B\uFEFF]/u);
  });

  it('keeps literal typography-class tags as text rather than normalizing them as output', () => {
    const source =
      '<span class="nowrap-date-range">8-10 октября</span><span class="typograf-oa-n-lquote">«</span>';
    const html = formatTextHtml(source);
    expect(showNbsp(dom(html).textContent)).toMatchInlineSnapshot(
      `"<span class="nowrap-date-range">8–10·октября</span><span class="typograf-oa-n-lquote">«</span>"`
    );
    expect(dom(html).textContent).toBe(formatText(source));
    expect(dom(html).querySelectorAll('.nowrap-date-range')).toHaveLength(1);
    expect(formatDynamicHtml(html)).toBe(html);
  });

  it.each([
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря'
  ])('wraps a range with a shared month: %s', (month) => {
    const output = formatTextHtml(`8-10 ${month}`);
    expect(output).toBe(formatTextHtml(`8–10 ${month}`));
    expect(dom(output).querySelector('.nowrap-date-range')?.textContent).toBe(`8–10\u00A0${month}`);
  });

  it.each([
    '108-10 октября',
    '8-110 октября',
    '0-10 октября',
    '8-32 октября',
    '8-10 октябрями',
    '8-10 октября2',
    'а8-10 октября',
    '_8-10 октября',
    '8-10 октября_',
    '8-10',
    '8-10 человек',
    '8 октября — 10 ноября',
    '8-10 окт.'
  ])('does not wrap a different numeric expression: %s', (source) => {
    expect(formatTextHtml(source)).not.toContain('nowrap-date-range');
  });

  it('keeps the year and surrounding punctuation outside the date wrapper', () => {
    expect(
      showNbsp(formatTextHtml('Начало (8-10 октября 2026 года), затем продолжение.'))
    ).toMatchInlineSnapshot(
      `"Начало (<span class="nowrap-date-range">8–10·октября</span> 2026 года), затем продолжение."`
    );
  });

  it('applies only hanging quotes together with dates, and stays idempotent', () => {
    const html = formatDynamicHtml('<p>Программа «8-10 октября» (день, вечер).</p>');
    expect(showNbsp(html)).toMatchInlineSnapshot(
      `"<p>Программа<span class="typograf-oa-sp-lquote"> </span><span class="typograf-oa-lquote">«</span><span class="nowrap-date-range">8–10·октября</span>» (день, вечер).</p>"`
    );
    expect(formatDynamicHtml(html)).toBe(html);
    expect(html).not.toMatch(/typograf-oa-(?:.*bracket|comma)/u);
    expect(dom(html).textContent).toBe(formatText('Программа «8-10 октября» (день, вечер).'));
  });

  it('preserves HTML attributes and numeric spellings of literal markup characters', () => {
    const html =
      '<a href="/8-10/" title="8-10 октября &quot;план&quot;" data-label="8-10 октября">&#60;b&#62; 8-10 октября &#38;copy;</a>';
    const element = dom(formatDynamicHtml(html));
    const link = element.querySelector('a');
    expect(Array.from(link?.attributes ?? [], ({ name, value }) => [name, value]))
      .toMatchInlineSnapshot(`
        [
          [
            "href",
            "/8-10/",
          ],
          [
            "title",
            "8-10 октября "план"",
          ],
          [
            "data-label",
            "8-10 октября",
          ],
        ]
      `);
    expect(element.querySelector('b')).toBeNull();
    expect(showNbsp(link?.textContent ?? '')).toMatchInlineSnapshot(`"<b> 8–10·октября &copy;"`);
    expect(formatDynamicHtml(formatDynamicHtml(html))).toBe(formatDynamicHtml(html));
  });

  it.each(['nowrap-date-range', 'typograf-oa-n-lquote'])(
    'preserves literal %s markup inside attributes during cleanup',
    (className) => {
      const attribute = `<span class="${className}">8-10 октября</span>`;
      const openingTag = `<a title='${attribute}' data-note="дата > 8-10 октября">`;
      const html = formatDynamicHtml(`${openingTag}«8-10 октября»</a>`);
      expect(html).toContain(openingTag);
      expect(dom(html).querySelector('a')?.getAttribute('title')).toBe(attribute);
      expect(dom(html).querySelectorAll('.nowrap-date-range')).toHaveLength(1);
      expect(formatDynamicHtml(html)).toBe(html);
    }
  );

  it.each(['code', 'kbd', 'math', 'object', 'pre', 'samp', 'script', 'style', 'textarea', 'var'])(
    'leaves protected <%s> content untouched',
    (tag) => {
      const html = `<${tag} data-label="8-10 октября">"8-10 октября" &copy;</${tag}>`;
      expect(formatDynamicHtml(html)).toBe(html);
    }
  );

  it('preserves existing typography markup inside protected HTML', () => {
    const content =
      '<span class="typograf-oa-n-lquote">«</span><span class="nowrap-date-range">8–10\u00A0октября</span>»';
    const html = `<code>${content}</code><!--${content}-->`;
    expect(formatDynamicHtml(html)).toBe(html);
  });
});

describe('shared typography AST adapter', () => {
  it('balances inline leading quotes against the space before strong and links', async () => {
    const source =
      '<p>сообщение <strong>«Оформление пропуска недоступно»</strong>. Позже <a href="/help/">«Личный помощник» ответил</a>.</p>';
    const html = formatDynamicHtml(source);
    const expected = dom(html).innerHTML;
    expect(expected).toMatchInlineSnapshot(
      `"<p>сообщение<span class="typograf-oa-sp-lquote"> </span><strong><span class="typograf-oa-lquote">«</span>Оформление пропуска недоступно»</strong>. Позже<span class="typograf-oa-sp-lquote"> </span><a href="/help/"><span class="typograf-oa-lquote">«</span>Личный помощник» ответил</a>.</p>"`
    );
    expect(dom(rehypeHtml(source)).innerHTML).toBe(expected);
    expect(dom(await satteriHtml(source)).innerHTML).toBe(expected);
    expect(formatDynamicHtml(html)).toBe(html);
    expect(dom(rehypeHtml(source, 2)).innerHTML).toBe(expected);
    expect(dom(await satteriHtml(source, 2)).innerHTML).toBe(expected);
  });

  it.each([
    '«8-10 октября»',
    '<strong>«8-10 октября»</strong>',
    '<a href="/events/">«8-10 октября»</a>',
    '<strong><em>«8-10 октября»</em></strong>'
  ])('keeps real paragraph-start hanging quotes through inline formatting: %s', async (content) => {
    const source = `<p>Предыдущий абзац.</p><p>${content}</p>`;
    const html = formatDynamicHtml(source);
    const expected = dom(html).innerHTML;
    expect(dom(html).querySelectorAll('.typograf-oa-n-lquote')).toHaveLength(1);
    expect(dom(html).querySelectorAll('.typograf-oa-sp-lquote')).toHaveLength(0);
    expect(dom(rehypeHtml(source, 2)).innerHTML).toBe(expected);
    expect(dom(await satteriHtml(source, 2)).innerHTML).toBe(expected);
    expect(formatDynamicHtml(html)).toBe(html);
  });

  it.each([
    '<p>слово<strong>«8-10 октября»</strong></p>',
    '<p><code>«код»</code> <strong>«8-10 октября»</strong></p>',
    '<p>Строка<br><strong>«8-10 октября»</strong></p>',
    '<p>Начало <em>слово <strong>«8-10 октября»</strong></em></p>',
    '<p><em>Начало </em><a href="/">«8-10 октября»</a></p>',
    '<p><em>Начало</em> «8-10 октября»</p>',
    '<p><!--note--> «8-10 октября»</p>',
    '<p><strong>«Начало»</strong> «8-10 октября»</p>'
  ])('retains inline and protected boundaries when aligning quotes: %s', async (source) => {
    const html = formatDynamicHtml(source);
    const expected = dom(html).innerHTML;
    expect(dom(rehypeHtml(source, 2)).innerHTML).toBe(expected);
    expect(dom(await satteriHtml(source, 2)).innerHTML).toBe(expected);
    expect(formatDynamicHtml(html)).toBe(html);
  });

  it('matches the HTML path inside complete emphasis and links', async () => {
    const source =
      '<p>Начало <strong>8-10 октября</strong>, затем <a href="/events/" title="8-10 октября">«8-10 октября»</a>.</p>';
    const expected = dom(formatDynamicHtml(source)).innerHTML;
    expect(dom(rehypeHtml(source)).innerHTML).toBe(expected);
    expect(dom(await satteriHtml(source)).innerHTML).toBe(expected);
  });

  it('preserves whitespace and literal text while inserting multiple sibling nodes', async () => {
    const source =
      '<p>  &lt;em&gt; &amp;copy; «8-10 октября» \t\n<strong>слово</strong>\n  конец  </p>';
    const rehype = dom(rehypeHtml(source));
    const satteri = dom(await satteriHtml(source));
    expect(showNbsp(rehype.innerHTML)).toMatchInlineSnapshot(`
      "<p>  &lt;em&gt; &amp;copy;<span class="typograf-oa-sp-lquote"> </span><span class="typograf-oa-lquote">«</span><span class="nowrap-date-range">8–10&nbsp;октября</span>» 	
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
