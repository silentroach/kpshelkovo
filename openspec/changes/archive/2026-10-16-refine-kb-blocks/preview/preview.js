const page = document.querySelector('#page');
const width = document.querySelector('#width');
const tocStyle = document.querySelector('#toc-style');
const frames = [...document.querySelectorAll('iframe')];
const jump = document.querySelector('#jump');

const descriptions = {
  gas: 'Оглавление на полноширинной полосе с фоном хлебных крошек. Текст сохраняет прежнее выравнивание.',
  offer:
    'Содержание на фоне хлебных крошек: сравните сплошной список с группами договора и приложений. На компьютере группы стоят рядом.',
  contacts:
    'Пояснение о разных добавочных выделено общим стилем примечания. Номера и текст сохранены.',
  catalog: 'Каталог показан для сверки с остальными страницами.'
};

function resize() {
  const targetWidth = Number(width.value);
  const targetHeight = targetWidth === 1440 ? 1000 : 844;
  for (const frame of frames) {
    const space = frame.parentElement;
    const available = space.parentElement.clientWidth - 2;
    const scale = Math.min(1, available / targetWidth);
    frame.width = targetWidth;
    frame.height = targetHeight;
    frame.style.transform = `scale(${scale})`;
    space.style.width = `${targetWidth * scale + 2}px`;
    space.style.height = `${targetHeight * scale + 2}px`;
  }
}

function update() {
  let paths;
  switch (page.value) {
    case 'gas':
      paths = ['before-gas.html', 'after-gas-expanded.html'];
      break;
    case 'contacts':
      paths = ['before-contacts.html', 'after-contacts-expanded.html'];
      break;
    case 'catalog':
      paths = ['before-catalog.html', 'after-catalog-expanded.html'];
      break;
    case 'offer':
      paths = [
        'before-offer.html',
        tocStyle.value === 'expanded' ? 'after-offer-expanded.html' : 'after-offer-grouped.html'
      ];
      break;
    default:
      return;
  }
  frames.forEach((frame, index) => {
    if (!frame.src.endsWith('/' + paths[index])) frame.src = paths[index];
  });
  document.querySelector('#before-link').href = paths[0];
  document.querySelector('#after-link').href = paths[1];
  document.querySelector('#description').textContent = descriptions[page.value];
  document.querySelector('#toc-style-label').hidden = page.value !== 'offer';
  jump.hidden = page.value === 'catalog';
  jump.textContent = page.value === 'contacts' ? 'К пояснению' : 'К оглавлению';
  resize();
}

for (const control of [page, width, tocStyle]) control.addEventListener('change', update);
jump.addEventListener('click', () => {
  for (const frame of frames) {
    const document = frame.contentDocument;
    const target =
      page.value === 'contacts'
        ? [...document.querySelectorAll('.kb-body p')].find((node) =>
            node.textContent.includes('добавочные отличаются:')
          )
        : document.querySelector('.kb-preview-toc, .ui-markdown-toc__title');
    const block = target?.closest('.ui-callout') ?? target;
    if (block)
      frame.contentWindow.scrollTo(
        0,
        block.getBoundingClientRect().top + frame.contentWindow.scrollY - 80
      );
  }
});
new ResizeObserver(resize).observe(document.querySelector('.comparison'));
update();
