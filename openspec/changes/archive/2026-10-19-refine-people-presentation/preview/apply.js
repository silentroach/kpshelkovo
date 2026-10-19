// Browser-only visual fixture. Production should render structured profile data.
(() => {
  const main = document.querySelector('.person-profile');
  const slug = location.pathname.split('/').filter(Boolean).at(-1);
  const headline = main.querySelector('.person-profile__headline');
  const roles = document.createElement('div');
  roles.className = 'person-profile__roles';
  const original = headline.textContent.trim();
  const splitAt = original.lastIndexOf(', ');
  const entries =
    slug === 'ykizilov'
      ? [{ position: 'Генеральный директор', company: 'группа компаний «Земля МО»' }]
      : [{ position: original.slice(0, splitAt), company: original.slice(splitAt + 2) }];

  for (const entry of entries) {
    const role = document.createElement('div');
    role.className = 'person-profile__role';
    for (const [key, text] of Object.entries(entry)) {
      const line = document.createElement('p');
      line.className = `person-profile__${key}`;
      line.textContent = text;
      role.append(line);
    }
    roles.append(role);
  }

  if (slug === 'sminakov') {
    const article = document.createElement('article');
    article.className = 'person-profile__article';
    const body = document.createElement('div');
    body.className = 'person-profile__body ui-prose';
    for (const { name, value } of headline.attributes) {
      if (name.startsWith('data-astro-cid-')) {
        article.setAttribute(name, value);
        body.setAttribute(name, value);
      }
    }
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Бывший руководитель группы компаний «Земля МО».';
    body.append(paragraph);
    article.append(body);
    main.querySelector('.person-profile__header-inner').append(article);
    headline.remove();
  } else {
    headline.replaceWith(roles);
  }
  const contacts = main.querySelector('.person-profile__contacts');
  const photo = main.querySelector('.person-profile__photo');
  if (photo) contacts.after(photo);
  if (!contacts.querySelector('.person-profile__contact-link')) contacts.remove();
  main.classList.add('person-profile--preview');
})();
