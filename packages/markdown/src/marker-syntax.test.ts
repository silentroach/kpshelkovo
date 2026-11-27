import { describe, expect, it } from 'vitest';

import {
  createMarkdownDocument,
  extractMarkdownText,
  parseMarkdownFragment,
  render,
  serializeMarkdownDocument
} from './index';

const serializeFragment = (source: string): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children: parseMarkdownFragment(source) }));

describe('editorial marker', () => {
  it('preserves a link in a multiline mark and keeps a second mark separate', () => {
    const source = '==Open [the guide](/guide/?check==yes)\nfor details== and ==check back==.';

    expect(render(source)).toMatchInlineSnapshot(`
      "<p><mark class="ui-editorial-marker">Open <a href="/guide/?check==yes">the guide</a>
      for details</mark> and <mark class="ui-editorial-marker">check back</mark>.</p>"
    `);
    expect(serializeFragment(source)).toMatchInlineSnapshot(`
      "**Open [the guide](/guide/?check==yes)
      for details** and **check back**.
      "
    `);
    expect(extractMarkdownText(source)).toBe('Open the guide for details and check back.');
  });

  it('preserves a hard line break inside the mark', () => {
    const source = '==First line\\\nsecond line==';

    expect(render(source)).toMatchInlineSnapshot(`
      "<p><mark class="ui-editorial-marker">First line<br>
      second line</mark></p>"
    `);
    expect(serializeFragment(source)).toBe('**First line\\\nsecond line**\n');
    expect(extractMarkdownText(source)).toBe('First line second line');
  });

  it('leaves marker delimiters literal inside inline and fenced code', () => {
    const source = '==Type `==word==` here==.\n\n```text\n==word==\n```';

    expect(render(source)).toMatchInlineSnapshot(`
      "<p><mark class="ui-editorial-marker">Type <code>==word==</code> here</mark>.</p>
      <pre><code class="language-text">==word==
      </code></pre>"
    `);
    expect(serializeFragment(source)).toBe('**Type `==word==` here**.\n\n```text\n==word==\n```\n');
    expect(extractMarkdownText(source)).toBe('Type ==word== here.');
  });

  it('does not match escaped, empty or unpaired delimiters across paragraphs', () => {
    const source = '\\==escaped== and ====.\n\nFirst ==unfinished\n\nnext== ends here.';

    expect(render(source)).toMatchInlineSnapshot(`
      "<p>==escaped== and ====.</p>
      <p>First ==unfinished</p>
      <p>next== ends here.</p>"
    `);
    expect(extractMarkdownText(source)).toBe(
      '==escaped== and ====. First ==unfinished next== ends here.'
    );
  });

  it('supports emphasis inside a mark and a mark inside emphasis', () => {
    const source = '==*this* and **that**==. *==Here==* and **==there==**.';

    expect(render(source)).toMatchInlineSnapshot(`
      "<p><mark class="ui-editorial-marker"><em>this</em> and <strong>that</strong></mark>. <em><mark class="ui-editorial-marker">Here</mark></em> and <strong><mark class="ui-editorial-marker">there</mark></strong>.</p>"
    `);
    expect(serializeFragment(source)).toBe(
      '**_this_ and __that__**. ***Here*** and **__there__**.\n'
    );
    expect(extractMarkdownText(source)).toBe('this and that. Here and there.');
  });

  it('uses the inner pair when marker delimiters are nested', () => {
    expect(render('==one ==two== three==')).toMatchInlineSnapshot(
      `"<p>==one <mark class="ui-editorial-marker">two</mark> three==</p>"`
    );
  });

  it.each(['word*=text*', '*x=*word', 'word**=text**'])(
    'does not change emphasis parsing next to a literal equals sign: %s',
    (source) => {
      expect(render(source)).toBe(`<p>${source}</p>`);
    }
  );
});
