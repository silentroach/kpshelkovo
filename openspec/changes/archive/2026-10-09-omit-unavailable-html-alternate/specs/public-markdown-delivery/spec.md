# Spec Delta

## MODIFIED Requirements

### Requirement: Альтернативные представления обнаруживаются из HTML и HTTP

HTML-страница SHALL указывать объявленный Markdown через HTTP `Link` с `rel="alternate"; type="text/markdown"`, HTML `<link rel="alternate" type="text/markdown">` и текстовый указатель инструментам чтения. Negotiated Markdown в GET и HEAD SHALL давать обратный HTTP alternate с `text/html` только при опубликованном HTML; ссылки SHALL NOT объявлять несуществующий HTML. Прямой Markdown URL SHALL оставаться самостоятельным входом без обязательного обратного HTTP `Link`.

#### Scenario: Клиент начинает с HTML

- **WHEN** HTTP-клиент либо инструмент чтения HTML открывает страницу с объявленным Markdown-представлением
- **THEN** он может обнаружить Markdown её альтернативными ссылками

#### Scenario: Клиент согласовал Markdown

- **WHEN** Markdown получен через `Accept` по адресу с опубликованным HTML-представлением
- **THEN** заголовок ответа позволяет обнаружить HTML-представление

#### Scenario: Markdown-only вход

- **WHEN** клиент получает negotiated Markdown через GET или HEAD по адресу без опубликованного HTML
- **THEN** HTTP `Link` не объявляет HTML alternate, сохраняя остальные предусмотренные ссылки обнаружения

#### Scenario: HEAD существующей пары

- **WHEN** клиент запрашивает negotiated Markdown методом HEAD по адресу с опубликованным HTML
- **THEN** ответ объявляет то же HTML alternate, что GET этого представления, без тела ответа
