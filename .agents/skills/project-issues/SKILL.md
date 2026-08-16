---
name: project-issues
description: Работает с GitHub-задачами проекта kpshelkovo. Используй, когда пользователь просит создать, оформить или решить issue/тикет/задачу проекта либо открыть связанный pull request.
---

# Project Issues

- Репозиторий проекта: `silentroach/kpshelkovo` (`https://github.com/silentroach/kpshelkovo`). Для issue и pull request используй `gh` с явным `--repo silentroach/kpshelkovo`.
- Если создаешь issue от имени агента, добавь label `ai`.
- Если пользователь просит решить issue, создай отдельные worktree и ветку. Делай небольшие осмысленные коммиты по Conventional Commits и связывай их с issue через `Refs #<number>`. Первая строка коммита может быть на английском, но поясняющее описание в body пиши по-русски.
- Как только решение issue готово и проверки прошли, отправь ветку и создай pull request, не ожидая отдельной просьбы пользователя. Свяжи его с issue через `Closes #<number>` и добавь label `ai`.
- Заголовок pull request пиши на русском: кратко и по существу, без префиксов и scope из Conventional Commits.
- Описание pull request пиши на русском. Кратко укажи проблему, ход рассуждений, принятое решение и выполненные проверки.
- Не ревьюй и не мержи созданный тобой pull request: это делает пользователь.
