// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/components/maps/editorial-map.css'), 'utf8');

afterEach(() => {
  document.body.replaceChildren();
  document.head.querySelector('[data-editorial-map-style]')?.remove();
});

it('keeps labels wrappable and groups the caption with the map and its focusable link', () => {
  const style = document.createElement('style');
  style.dataset.editorialMapStyle = '';
  style.textContent = css;
  document.head.append(style);

  const prose = document.createElement('div');
  prose.className = 'ui-prose';
  const figure = document.createElement('figure');
  figure.className = 'ui-editorial-map';
  figure.innerHTML =
    '<editorial-map></editorial-map><figcaption class="ui-editorial-map__caption"><h3 class="ui-editorial-map__title" id="editorial-map-1"><a href="https://example.org/map">Схема прохода</a></h3></figcaption>';
  const marker = document.createElement('span');
  marker.className = 'editorial-map-marker__caption';
  marker.textContent = 'Длинное название проезда через ворота';
  figure.querySelector('editorial-map')?.append(marker);
  prose.append(figure);
  document.body.append(prose);

  const labelStyle = getComputedStyle(marker);
  const caption = figure.querySelector('figcaption')!;
  const title = caption.querySelector('h3')!;
  const link = title.querySelector('a')!;
  expect(labelStyle.whiteSpace).toBe('normal');
  expect(labelStyle.overflowWrap).toBe('anywhere');
  expect(labelStyle.maxInlineSize).toContain('10rem');
  expect(labelStyle.fontSize).toBe('12px');
  expect(labelStyle.fontWeight).toBe('400');
  expect(getComputedStyle(title).fontSize).toBe('0.875rem');
  expect(getComputedStyle(title).fontWeight).toBe('400');
  link.focus();
  expect(document.activeElement).toBe(link);
  const focusRule = Array.from(style.sheet?.cssRules ?? []).find(
    (rule) =>
      rule instanceof CSSStyleRule &&
      rule.selectorText.includes('.ui-editorial-map__caption a:focus-visible')
  ) as CSSStyleRule | undefined;
  expect(focusRule?.style.getPropertyValue('outline-offset')).toBe('0.125rem');
  expect(title.id).toBe('editorial-map-1');
  expect(figure.querySelectorAll('a')).toHaveLength(1);
});
