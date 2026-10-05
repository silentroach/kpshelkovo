## MODIFIED Requirements

### Requirement: HTML и Markdown представляют одну страницу KB

Каждая HTML-страница `/kb/` SHALL иметь соответствующий Markdown companion: `/kb/index.md` для корня и `/kb/<путь>/index.md` для вложенной страницы. Оба представления SHALL передавать заголовок и подготовленное редакционное содержание одной страницы; Markdown companion SHALL сохранять поддержанные флаги и вести внутренние ссылки на HTML-страницы KB к соответствующим Markdown companions. HTTP-выдача Markdown определяется [public-markdown-delivery](/openspec/specs/public-markdown-delivery/spec.md).

#### Scenario: Читатель и машинный потребитель открывают одну страницу

- **WHEN** опубликована вложенная страница KB с текстом и служебным флагом
- **THEN** доступны её HTML- и Markdown-адреса с тем же заголовком и содержанием, а Markdown companion сохраняет флаг

#### Scenario: Переход внутри Markdown-версии

- **WHEN** исходное тело страницы содержит ссылку на другую страницу `/kb/`
- **THEN** в Markdown companion ссылка ведёт к Markdown companion целевой страницы
