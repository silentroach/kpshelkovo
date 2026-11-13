# Spec Delta

## MODIFIED Requirements

### Requirement: Метаданные карточки доступны во frontmatter

`/map/[slug]/index.md` SHALL начинаться с YAML frontmatter: название в `title`, машинный `category`, lifecycle `status` (`existing`, `planned`, `underConstruction`), `map.coordinates` с числовыми `lat` и `lng` по `public-coordinate-precision`, `address` при наличии. `status` SHALL NOT означать текущую открытость. Редакторское закрытие SHALL передаваться отдельным `availability` по `place-availability`, действующее расписание — по `place-opening-hours`. Неизвестные необязательные сведения и внутренние редакционные или технические поля SHALL NOT публиковаться автоматически.

#### Scenario: Карточка с адресом

- **WHEN** потребитель читает Markdown-карточку места с адресом
- **THEN** frontmatter содержит название, код категории, lifecycle-статус, адрес и числовые координаты места с установленной публичной точностью
- **AND** для извлечения этих сведений не требуется разбирать русские подписи в body

#### Scenario: Необязательные сведения отсутствуют

- **WHEN** у места нет адреса, связанного контакта, расписания и редакционного закрытия
- **THEN** frontmatter не содержит ключей `address`, `contact_url`, `opening_hours` и `availability`
- **AND** отсутствующие сведения не заменяются пустыми полями, `null` или строкой `undefined`
- **AND** название, категория, lifecycle-статус, координаты и обязательные ссылки остаются доступны
