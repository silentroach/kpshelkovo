# Передача реализации в следующую сессию

## Разрешения и состояние

- Рабочая ветка: `plan/1060-review-list`.
- Change: `refine-review-list-presentation`, связан с [#1060](https://github.com/silentroach/kpshelkovo/issues/1060).
- Владелец выбрал Г для списка отзывов, разрешил сохранить план и явно попросил создать PR с change, но отложить реализацию до отдельной сессии в этой же ветке и PR.
- Ветка содержит план и статическую галерею. Код приложения и опубликованные отзывы этим изменением ещё не исправлены. Все пункты `tasks.md` относятся к будущей реализации.
- Change остаётся активным. Синхронизация основной spec и архивирование выполняются после реализации и приёмки.

## С чего продолжить

1. Найти PR ветки `plan/1060-review-list`, прочитать обсуждение и фактическое состояние рабочей копии. Получить явную команду владельца начать реализацию; публикация плана сама по себе её не разрешает.
2. Прочитать [proposal](/openspec/changes/refine-review-list-presentation/proposal.md), [design](/openspec/changes/refine-review-list-presentation/design.md), [delta](/openspec/changes/refine-review-list-presentation/specs/owner-reviews/spec.md) и [tasks](/openspec/changes/refine-review-list-presentation/tasks.md).
3. Использовать [сохранённую примерку Г](/openspec/changes/refine-review-list-presentation/comparison.md) как визуальный ориентир. [quotes.json](/openspec/changes/refine-review-list-presentation/preview/quotes.json) содержит уже вычитанные дословные фрагменты; после переноса production-источником становится frontmatter.
4. Продолжить штатным apply workflow в той же ветке. Существующий draft PR пополняется кодом, приёмкой, синхронизированными specs и архивом; второй PR для реализации не нужен.

Текущий статус:

```bash
pnpm exec openspec status --change refine-review-list-presentation --json
```

Самостоятельная композиция отдельного отзыва остаётся для дальнейшего обсуждения в #1060. Этот этап реализует список и проверяет общие компоненты на отсутствие регрессий в полной странице.
