import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Window } from 'happy-dom';

// Frozen visual study, not the production Markdown renderer.
// Rebuilds from the committed before-*.html snapshots without network requests.
const root = dirname(fileURLToPath(import.meta.url));
const styles = await readFile(join(root, 'proposal.css'), 'utf8');
const pages = ['gas', 'offer', 'contacts', 'catalog'];

function readDocument(html) {
  const window = new Window({
    url: 'http://localhost:4358',
    settings: { disableJavaScriptEvaluation: true, disableCSSFileLoading: true }
  });
  window.document.write(html);
  return window.document;
}

function groupOfferToc(document, list) {
  const items = [...list.children];
  const introduction = /^\d+\./u.test(items[0].textContent.trim())
    ? undefined
    : items.shift().querySelector('a');
  if (introduction) introduction.classList.add('kb-preview-toc__intro');
  const appendixIndex = items.findIndex((item) => /^Приложение\s*№/.test(item.textContent.trim()));
  const layout = document.createElement('div');
  layout.className = 'kb-preview-toc__groups';
  for (const [name, entries] of [
    ['Договор', items.slice(0, appendixIndex)],
    ['Приложения', items.slice(appendixIndex)]
  ]) {
    const group = document.createElement('section');
    group.setAttribute('aria-label', name);
    const heading = document.createElement('p');
    heading.className = 'kb-preview-toc__group-title';
    heading.textContent = name;
    const groupList = list.cloneNode(false);
    for (const item of entries) {
      const link = item.querySelector('a');
      const fullTitle = link.textContent.replace(/[ \t\r\n]+/gu, ' ').trim();
      const numbered = /^(?:Приложение\s*№\s*)?(\d+)[.:]?\s*(.*)$/u.exec(fullTitle);
      const number = document.createElement('span');
      number.className = 'kb-preview-toc__number';
      number.textContent = numbered ? numbered[1] + '.' : '';
      number.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'kb-preview-toc__label';
      label.textContent = numbered ? numbered[2] : fullTitle;
      link.setAttribute('aria-label', fullTitle);
      link.replaceChildren(number, label);
      groupList.append(item);
    }
    group.append(heading, groupList);
    layout.append(group);
  }
  return { introduction, layout };
}

function frameToc(document, grouped = false) {
  const title = document.querySelector('.ui-markdown-toc__title');
  const list = document.querySelector('.ui-markdown-toc__list');
  if (!title || !list) return;
  const separator = list.nextElementSibling;
  const prose = title.parentElement;
  const nodes = [...prose.childNodes];
  const wrapper = document.createElement('nav');
  wrapper.className = 'ui-prose kb-preview-toc' + (grouped ? ' kb-preview-toc--grouped' : '');
  wrapper.setAttribute('aria-label', 'Содержание');
  const inner = document.createElement('div');
  inner.className = 'kb-preview-toc__inner';
  if (grouped) {
    const { introduction, layout } = groupOfferToc(document, list);
    const heading = document.createElement('div');
    heading.className = 'kb-preview-toc__heading';
    heading.append(title);
    if (introduction) heading.append(introduction);
    inner.append(heading, layout);
  } else {
    inner.append(title, list);
  }
  wrapper.append(inner);
  const columns = [true, false].map(() => {
    const column = document.createElement('div');
    column.className = 'kb-preview-column';
    column.append(prose.cloneNode(false));
    return column;
  });
  let after = false;
  for (const node of nodes) {
    if (node === title || node === list || (node === separator && separator.tagName === 'HR')) {
      after = true;
    } else {
      columns[after ? 1 : 0].firstElementChild.append(node);
    }
  }
  prose.replaceWith(columns[0], wrapper, columns[1]);
  document.querySelector('.kb-page').classList.add('kb-preview-page');
}

function documentRow(document) {
  const article = document.querySelector('.kb-body .ui-prose');
  const warning = article.querySelector('.ui-callout--warning');
  const original = warning.querySelector('a.ui-file-link');
  const edition = [...article.querySelectorAll(':scope > p')].find((paragraph) =>
    paragraph.textContent.startsWith('Редакция от')
  );
  const source = document.createElement('aside');
  source.className = 'kb-preview-document';
  const row = document.createElement('p');
  row.className = 'kb-preview-document__edition';
  const link = original.cloneNode(true);
  [...link.childNodes].filter((node) => node.nodeType === 3).forEach((node) => node.remove());
  const label = document.createElement('span');
  label.textContent = 'Оригинал от 09 июня 2026';
  link.append(label);
  link.title = 'Оригинал документа (PDF)';
  row.append(link);
  const note = document.createElement('p');
  note.className = 'kb-preview-document__note';
  note.textContent = 'Текст распознан автоматически и может содержать неточности.';
  source.append(row, note);
  warning.replaceWith(source);
  edition.remove();
}

function highlightContactNote(document) {
  const paragraph = [...document.querySelectorAll('.kb-body p')].find((node) =>
    node.textContent.includes('добавочные отличаются:')
  );
  const note = document.createElement('aside');
  note.className = 'ui-callout ui-callout--note';
  const title = document.createElement('p');
  title.className = 'ui-callout__title';
  title.textContent = 'Добавочные отличаются';
  paragraph.before(note);
  paragraph
    .querySelectorAll('strong')
    .forEach((strong) => strong.replaceWith(...strong.childNodes));
  note.append(title, paragraph);
}

for (const name of pages) {
  const before = await readFile(join(root, `before-${name}.html`), 'utf8');
  for (const mode of name === 'offer' ? ['expanded', 'grouped'] : ['expanded']) {
    const variant = readDocument(before);
    if (name === 'offer') documentRow(variant);
    if (name === 'contacts') highlightContactNote(variant);
    frameToc(variant, mode === 'grouped');
    const style = variant.createElement('style');
    style.textContent = styles;
    variant.head.append(style);
    const after = '<!doctype html>\n' + variant.documentElement.outerHTML;
    await writeFile(join(root, `after-${name}-${mode}.html`), after);
  }
  console.log(`Rendered ${name}`);
}
