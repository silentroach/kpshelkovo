---
name: project-issues
description: Работает с GitHub-задачами проекта kpshelkovo. Используй, когда пользователь просит создать, оформить или решить issue/тикет/задачу проекта либо открыть связанный pull request.
---

# Project Issues

- Репозиторий проекта: `silentroach/kpshelkovo` (`https://github.com/silentroach/kpshelkovo`). Для issue и pull request используй `gh` с явным `--repo silentroach/kpshelkovo`.
- Если создаешь issue от имени агента, добавь label `ai`.
- Если пользователь просит решить issue, создай отдельные worktree и ветку. Делай небольшие осмысленные коммиты и связывай их с issue через `Refs #<number>`.
- Если создаешь pull request, свяжи его с issue через `Closes #<number>` и добавь label `ai`.
- В описании pull request кратко укажи проблему, ход рассуждений и принятое решение.
- Не ревьюй и не мержи созданный тобой pull request: это делает пользователь.
