# Production font subsets

В этой папке лежат три WOFF2-файла, которые сайт загружает для разрешенных начертаний Fira Sans 400/600 и PT Serif 700. Production-сабсет PT Serif называется `Shelkovo Serif`: OFL резервирует исходное имя для немодифицированного шрифта.

## Источник

Исходники взяты из репозитория [Google Fonts](https://github.com/google/fonts) на commit `ed7143b8f0c9587f9dcfbcdf5b34ec1a7bc07fca`:

- `ofl/firasans/FiraSans-Regular.ttf`, SHA-256 `c29556a2719bf613ef3d5e070e40d903a8965d9c081beca1375dc1e6e0f93c23`;
- `ofl/firasans/FiraSans-SemiBold.ttf`, SHA-256 `db0321f83eb3e9f527b8af384a1b3fefdc1039cf2b06fd39b3f61492bda9561c`;
- `ofl/ptserif/PT_Serif-Web-Bold.ttf`, SHA-256 `038ba7336bd7ea14f12ad155bed51a4345cac5153275d521dec3ba04021c526e`.

Оба семейства распространяются по SIL Open Font License 1.1. Уведомления об авторских правах и текст лицензии находятся в `LICENSES.txt`.

## Сборка

Из корня workspace:

```bash
pnpm fonts:build
```

Скрипт `scripts/build-font-subsets.sh` проверяет контрольные суммы исходников и запускает FontTools 4.59.1 с Brotli 1.1.0 в отдельном virtualenv. `--no-ignore-missing-unicodes` останавливает сборку, если исходник не содержит хотя бы один заявленный символ. На этапе сборки внутреннее имя модифицированного PT Serif меняется на `Shelkovo Serif` согласно Reserved Font Name в OFL.

Рабочий набор включает Basic Latin, Latin-1, поддерживаемую семействами кириллицу, комбинируемое ударение, кавычки, тире, многоточие, неразрывный пробел, `₽`, `№`, математический минус и основные стрелки для Fira Sans. Широкий Latin Extended в файлы не входит.
