const review = document.querySelector('#review');
const width = document.querySelector('#width');
const params = new URLSearchParams(location.search);
for (const control of [review, width]) {
  const value = params.get(control.id);
  if ([...control.options].some((option) => option.value === value)) control.value = value;
}

function update() {
  const name = review.selectedOptions[0].textContent;
  for (const variant of ['before', 'after']) {
    const src = `images/${review.value}-${width.value}-${variant}.webp`;
    const image = document.querySelector(`#${variant}`);
    image.src = src;
    image.alt = `${name}: ${variant === 'before' ? 'исходное оформление' : 'вариант Г'}`;
    document.querySelector(`#${variant}-link`).href = src;
  }
  document.querySelector('#pair').href = `images/${review.value}-${width.value}-pair.webp`;
  document.querySelector('.comparison').style.setProperty('--capture-width', `${width.value}px`);
  history.replaceState({}, '', `?review=${review.value}&width=${width.value}`);
}

review.addEventListener('change', update);
width.addEventListener('change', update);
update();
