# Tasks

## 1. Документация контракта

- [ ] 1.1 Сократить ADR-030 и обновить его запись в индексе: проверить сохранность причин нормализации, выбора коротких ID и исторического решения о v1; добавить ссылки на основную spec, публичные JSON Schema/OpenAPI и PR с измерениями.
- [ ] 1.2 Уточнить `description` операции detail OpenAPI в `apps/www/src/lib/reglament/discovery.ts`; отредактировать текст с `humanizer-ru` и проверить, что он объясняет `source_refs`, `sources`, `needs_check` и локальность ID без изменений структуры контрактов и данных.

## 2. Проверки и завершение

- [ ] 2.1 Сверить каждое требование и сценарий delta spec с ADR, схемой, сериализатором и тестами; выполнить `pnpm --filter @shelkovo/www exec vitest run src/lib/reglament/detail-json.test.ts src/lib/reglament/tests/detail-public-schema.test.ts src/lib/reglament/discovery.test.ts` и `pnpm --filter @shelkovo/www typecheck`.
- [ ] 2.2 Проверить ссылки и весь актуальный diff, включая новые файлы; выполнить ревью с `ponytail-review`, проверку форматирования затронутых файлов и `pnpm openspec:validate`; убедиться, что требования не дублируют схему и разовую миграцию.
- [ ] 2.3 Штатными sync/archive workflows перенести delta в основную `estimate-detail-sources` и архивировать change; повторно выполнить `pnpm openspec:validate` и проверить итоговые ссылки ADR и архива.
