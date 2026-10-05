# public-markdown-delivery Specification

## Purpose

Позволять людям, агентам и HTTP-клиентам надёжно получать объявленное Markdown-представление страницы по прямой ссылке и через согласование формата.

## Requirements

### Requirement: Объявленный Markdown доступен по прямому и согласуемому адресу

Страница с поддержкой Markdown negotiation SHALL сохранять прямой URL своего companion и возвращать Markdown по canonical HTML URL при явном приемлемом `Accept: text/markdown`. Обычный запрос HTML SHALL получать HTML. Markdown SHALL иметь `Content-Type: text/markdown; charset=utf-8` и явную политику кеширования; прямой URL SHALL выбирать ресурс самим путём. Страница без companion SHALL NOT объявлять его или имитировать negotiation.

#### Scenario: Два способа чтения

- **WHEN** клиент запрашивает прямой companion и canonical HTML URL с `Accept: text/markdown`
- **THEN** оба запроса возвращают Markdown той же страницы с корректным MIME
- **AND** HTML-запрос canonical URL возвращает HTML

#### Scenario: У страницы нет машинного представления

- **WHEN** страница не публикует Markdown companion
- **THEN** она не объявляет несуществующую альтернативу

### Requirement: Кеш различает формат и сжатие ответа

Каждый URL, выбирающий HTML либо Markdown по `Accept`, SHALL сообщать `Vary: Accept` в обеих ветках ответа. Если сжатие добавляет `Vary: Accept-Encoding`, итоговый ответ SHALL сохранять обе оси вариации независимо от количества полей `Vary`. Для прямого Markdown URL наличие `Vary: Accept` SHALL NOT быть условием корректности, поскольку формат выбран путём.

#### Scenario: HTML и Markdown проходят через общий кеш

- **WHEN** один negotiated URL запрошен как HTML и как Markdown с поддержкой сжатия
- **THEN** каждый ответ объявляет вариацию по `Accept`, сохраняя объявленную вариацию по `Accept-Encoding`

### Requirement: Альтернативные представления обнаруживаются из HTML и HTTP

HTML-страница с companion SHALL объявлять его через HTTP `Link` с `rel="alternate"; type="text/markdown"`, HTML `<link rel="alternate" type="text/markdown">` и текстовый указатель для инструментов чтения HTML. Negotiated Markdown-ответ SHALL публиковать обратную HTTP alternate-ссылку на HTML с типом `text/html`. Прямой companion SHALL оставаться самостоятельной точкой входа; обратный HTTP `Link` для каждого прямого Markdown URL не является обязательным.

#### Scenario: Клиент начинает с HTML

- **WHEN** HTTP-клиент либо инструмент чтения HTML открывает страницу с companion
- **THEN** он может обнаружить Markdown её альтернативными ссылками

#### Scenario: Клиент согласовал Markdown

- **WHEN** Markdown получен через `Accept` по HTML URL
- **THEN** заголовок ответа позволяет обнаружить HTML-представление

### Requirement: Обычные companions не создают отдельную поисковую копию

Прямые Markdown companions страниц, включая KB, и их negotiated Markdown-ответы SHALL получать `X-Robots-Tag: noindex, follow` независимо от возможности индексировать HTML. Это правило SHALL NOT распространяться по одному расширению `.md` на публичные документы `SKILL.md` в каталогах agent-skills: они являются отдельными инструкциями, а не обычными companions.

#### Scenario: Индексируемая HTML-страница KB

- **WHEN** HTML-страница KB разрешает внешнюю индексацию
- **THEN** её прямой и negotiated Markdown всё равно получают `noindex, follow`

#### Scenario: Публичная инструкция агенту

- **WHEN** клиент открывает публичный `SKILL.md` из каталога agent-skills
- **THEN** правило исключения companions само по себе не добавляет ему `noindex`
