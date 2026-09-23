# Tasks

## 1. Конфигурация и приёмка

- [x] 1.1 Обновить `openspec/config.yaml` по proposal и design; проверить через `pnpm exec openspec instructions <artifact-or-operation> --change refine-openspec-config --json` для `proposal`, `design`, `tasks`, `apply` и `archive`, что контекст и соответствующие правила доставляются без предупреждений и потери строк.
- [x] 1.2 Выполнить `pnpm openspec:validate`, проверку форматирования изменённых файлов и ревью всего актуального diff, включая новые артефакты; сверить каждую правку с согласованным объёмом и убедиться, что чекбоксы завершаются до архивирования.
