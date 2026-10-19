const profile = document.querySelector('#profile');
const width = document.querySelector('#width');
const note = document.querySelector('#note');
const params = new URLSearchParams(location.search);
for (const control of [profile, width]) {
  const value = params.get(control.id);
  if ([...control.options].some((option) => option.value === value)) control.value = value;
}

function update() {
  const name = profile.selectedOptions[0].textContent.split(' · ')[0];
  for (const variant of ['before', 'after']) {
    const src = `images/${profile.value}-${width.value}-${variant}.webp`;
    const image = document.querySelector(`#${variant}`);
    image.src = src;
    image.alt = `${name}: ${variant === 'before' ? 'текущее' : 'предложенное'} оформление`;
    document.querySelector(`#${variant}-link`).href = src;
  }
  document.querySelector('#pair').href = `images/${profile.value}-${width.value}-pair.webp`;
  document.querySelector('.comparison').style.setProperty('--capture-width', `${width.value}px`);
  note.textContent =
    profile.value === 'ykizilov'
      ? 'У Юрия одна должность: генеральный директор группы компаний «Земля МО». Название уточнено по официальному каналу компании. Должность и организация показаны отдельными строками; контакты и запись на приём сохранены.'
      : profile.value === 'sminakov'
        ? 'У Сергея сведения о прежней роли перенесены в описание: «Бывший руководитель группы компаний „Земля МО“». Подзаголовка с текущей должностью и секции контактов нет.'
        : 'Должность и организация разделены. Контакты на телефоне стоят перед фото, ссылки набраны обычным весом. У портрета тонкая граница и скругление. Если контактов нет, вся секция с заголовком скрыта.';
  history.replaceState({}, '', `?profile=${profile.value}&width=${width.value}`);
}

profile.addEventListener('change', update);
width.addEventListener('change', update);
update();
