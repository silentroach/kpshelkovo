// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';

import { formatDynamicHtml, formatText, formatTextHtml } from './index';

const showNbsp = (value: string): string =>
  value.replaceAll('\u00A0', '·').replaceAll('\u202F', '·');

const dom = (html: string): HTMLDivElement => {
  const element = document.createElement('div');
  element.innerHTML = html;
  return element;
};

describe('typography output contracts', () => {
  it('keeps ordinary typography in text output without HTML wrappers', () => {
    const output = formatText('"8-10 октября" в Шелково Ривер, Приложение №1');
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
      `"&lt;img src=x onerror="alert(1)"&gt; «<span class="nowrap-date-range">8–10&nbsp;октября</span>» &amp;quot;"`
    );
    expect(element.textContent).not.toMatch(/[\u2060\u200B\uFEFF]/u);
  });

  it('keeps literal typography-class tags as text rather than normalizing them as output', () => {
    const source = '<span class="nowrap-date-range">8-10 октября</span>';
    const html = formatTextHtml(source);
    expect(showNbsp(dom(html).textContent)).toMatchInlineSnapshot(
      `"<span class="nowrap-date-range">8–10·октября</span>"`
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

  it('formats ordinary quotes and dates, and stays idempotent', () => {
    const html = formatDynamicHtml('<p>Программа "8-10 октября" (день, вечер).</p>');
    expect(showNbsp(html)).toMatchInlineSnapshot(
      `"<p>Программа «<span class="nowrap-date-range">8–10·октября</span>» (день, вечер).</p>"`
    );
    expect(formatDynamicHtml(html)).toBe(html);
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

  it('preserves literal date markup inside attributes during cleanup', () => {
    const attribute = '<span class="nowrap-date-range">8-10 октября</span>';
    const openingTag = `<a title='${attribute}' data-note="дата > 8-10 октября">`;
    const html = formatDynamicHtml(`${openingTag}«8-10 октября»</a>`);
    expect(html).toContain(openingTag);
    expect(dom(html).querySelector('a')?.getAttribute('title')).toBe(attribute);
    expect(dom(html).querySelectorAll('.nowrap-date-range')).toHaveLength(1);
    expect(formatDynamicHtml(html)).toBe(html);
  });

  it.each(['code', 'kbd', 'math', 'object', 'pre', 'samp', 'script', 'style', 'textarea', 'var'])(
    'leaves protected <%s> content untouched',
    (tag) => {
      const html = `<${tag} data-label="8-10 октября">"8-10 октября" &copy;</${tag}>`;
      expect(formatDynamicHtml(html)).toBe(html);
    }
  );

  it('preserves existing typography markup inside protected HTML', () => {
    const content = '«<span class="nowrap-date-range">8–10\u00A0октября</span>»';
    const html = `<code>${content}</code><!--${content}-->`;
    expect(formatDynamicHtml(html)).toBe(html);
  });

  it('formats dynamic HTML with project typography rules', () => {
    expect(formatDynamicHtml('Шелково Ривер')).toBe('Шелково\u00A0Ривер');
    expect(formatDynamicHtml('<p>Шелково Парк</p>')).toBe('<p>Шелково\u00A0Парк</p>');
    expect(formatDynamicHtml('Новости Шелково')).toBe('Новости Шелково');
  });

  it('keeps a word before a number sign and its number on the same line', () => {
    expect(showNbsp(formatDynamicHtml('в Приложении №1'))).toMatchInlineSnapshot(
      `"в·Приложении·№·1"`
    );
    expect(showNbsp(formatDynamicHtml('п. № 1'))).toMatchInlineSnapshot(`"п.·№·1"`);
  });
});
