## MODIFIED Requirements

### Requirement: Контакт имеет самостоятельную карточку независимо от body

Каждый опубликованный контакт SHALL иметь HTML-карточку `/sarafan/<category>/<slug>/` и Markdown companion `/sarafan/<category>/<slug>/index.md`, даже при пустом body. Общий и категорийные списки в HTML и Markdown SHALL показывать название, доступное краткое описание и ссылку на карточку. Способы связи, адрес и доступная vCard SHALL публиковаться в карточке, а не в списках.

Канонические HTML URL общего списка `/sarafan/`, опубликованных категорийных списков `/sarafan/<category>/` и карточек контактов SHALL поддерживать получение соответствующего Markdown по `Accept: text/markdown`, сохраняя прямые Markdown companions. HTTP-выдача Markdown определяется [public-markdown-delivery](/openspec/specs/public-markdown-delivery/spec.md), а связи обнаружения — [public-content-discovery](/openspec/specs/public-content-discovery/spec.md).

#### Scenario: Карточка без редакционного body

- **WHEN** опубликован контакт с кратким описанием и способами связи, но без body
- **THEN** из HTML- и Markdown-списков можно открыть его самостоятельную карточку
- **AND** контактные данные и vCard при наличии доступны в карточке и отсутствуют в списках

#### Scenario: Получение Markdown по каноническому HTML URL

- **WHEN** клиент запрашивает канонический HTML URL общего списка, опубликованного категорийного списка либо карточки контакта с `Accept: text/markdown`
- **THEN** он получает соответствующее Markdown-представление, доступное также по прямому URL companion, по правилам общих владельцев доставки и обнаружения
