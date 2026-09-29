# Проверка WebP-маркеров

Task 1.2, 29 сентября 2026 года. Параметры — из [design](/openspec/changes/archive/2026-09-30-optimize-map-marker-images/design.md). Созданы 21 файл в `/packages/ui/src/markers/`; PNG сохранены, реестр и потребители не менялись в этой задаче.

Итог 30 сентября: после провала визуальной приёмки уменьшенные варианты удалены по предусмотренному fallback. В ветке остаются семь полноразмерных WebP (140 758 байт) и неизменные source PNG; семь runtime PNG заменены. Дальнейшие числа и команды описывают подготовку и проверку экспериментального набора, не состав итоговой сборки.

## Инструменты и воспроизведение

- macOS arm64; локальные `/opt/homebrew/bin/cwebp`, `/opt/homebrew/bin/dwebp`, `/opt/homebrew/bin/magick`. Установка зависимостей и `nix-shell` не потребовались.
- `cwebp -version`: libwebp **1.6.0**, libsharpyuv **0.4.2**; `dwebp -version`: **1.6.0**.
- `magick -version`: **ImageMagick 7.1.2-31 Q16-HDRI aarch64**, сборка `8309dc92a:20260903`, clang 21.0.0; PNG/WebP delegates доступны.
- Полноразмерные файлы закодированы непосредственно из runtime PNG, без resize. Уменьшение — Lanczos до заданной ширины, высота определяется инструментом; промежуточный PNG32 сохраняет 8-bit RGBA. Все варианты используют `-lossless -exact -m 6`, без near-lossless/lossy.

Эквивалентный воспроизводимый прогон из корня workspace; временные PNG и сырые RGBA остаются вне репозитория. Runtime PNG удалены из итоговой ветки после проверки импортов, поэтому команда извлекает их из коммита плана:

```bash
set -euo pipefail
markers=packages/ui/src/markers
tmp=$(mktemp -d "${TMPDIR:?}/opencode/marker-assets.XXXXXX")
inputs="$tmp/inputs"
mkdir -p "$inputs"
for name in Animals Apple Construction Fish Foodtruck Kpp Titanic; do
  git show "64e4169eaeabb03d1e6e2c2a3b3aee42a9cbf0bb:$markers/$name.png" \
    > "$inputs/$name.png"
done
shasum -a 256 "$inputs"/*.png "$markers"/*-source.png > "$tmp/inputs.sha256"

for name in Animals Apple Construction Fish Foodtruck Kpp Titanic; do
  cwebp -lossless -exact -m 6 -quiet "$inputs/$name.png" \
    -o "$markers/$name.webp"
  for width in 72 120; do
    magick "$inputs/$name.png" -filter Lanczos -resize "${width}x" \
      -depth 8 "PNG32:$tmp/$name-$width.png"
    cwebp -lossless -exact -m 6 -quiet "$tmp/$name-$width.png" \
      -o "$markers/$name-$width.webp"
  done
  for suffix in '' -72 -120; do
    input="$inputs/$name.png"
    if [ -n "$suffix" ]; then input="$tmp/$name$suffix.png"; fi
    output="$markers/$name$suffix.webp"
    test "$(magick identify -format '%w %h' "$input")" = \
      "$(magick identify -format '%w %h' "$output")"
    dwebp "$output" -quiet -o "$tmp/decoded.png"
    magick "$input" -depth 8 "RGBA:$tmp/input.rgba"
    magick "$tmp/decoded.png" -depth 8 "RGBA:$tmp/output.rgba"
    cmp "$tmp/input.rgba" "$tmp/output.rgba"
  done
done

shasum -a 256 -c "$tmp/inputs.sha256"
magick identify -format '%f %wx%h %b\n' "$markers"/*.webp
wc -c "$markers"/*.webp
```

## Размеры файлов и растров

Порядок в каждой строке: исходный runtime PNG; полноразмерный WebP; WebP 72; WebP 120. Все размеры файлов — в байтах; имя без суффикса соответствует полноразмерному варианту.

- **Animals:** PNG 144×144 — 26 514; `Animals.webp` 144×144 — 16 460; `Animals-72.webp` 72×72 — 8 640; `Animals-120.webp` 120×120 — 16 396.
- **Apple:** PNG 144×144 — 27 022; `Apple.webp` 144×144 — 18 454; `Apple-72.webp` 72×72 — 8 090; `Apple-120.webp` 120×120 — 17 174.
- **Construction:** PNG 144×141 — 33 564; `Construction.webp` 144×141 — 24 956; `Construction-72.webp` 72×71 — 11 312; `Construction-120.webp` 120×118 — 22 366.
- **Fish:** PNG 144×144 — 26 691; `Fish.webp` 144×144 — 18 672; `Fish-72.webp` 72×72 — 8 114; `Fish-120.webp` 120×120 — 17 512.
- **Foodtruck:** PNG 144×128 — 26 236; `Foodtruck.webp` 144×128 — 17 872; `Foodtruck-72.webp` 72×64 — 6 536; `Foodtruck-120.webp` 120×107 — 14 372.
- **Kpp:** PNG 144×137 — 25 606; `Kpp.webp` 144×137 — 17 300; `Kpp-72.webp` 72×69 — 6 634; `Kpp-120.webp` 120×114 — 14 056.
- **Titanic:** PNG 144×137 — 34 540; `Titanic.webp` 144×137 — 27 044; `Titanic-72.webp` 72×69 — 11 376; `Titanic-120.webp` 120×114 — 24 904.

Суммы:

- PNG baseline — **200 173 байта**; полноразмерный WebP — **140 758**, экономия **59 415 / 29,6818%**. Порог минимум 25% выполнен.
- Варианты 72 px — **60 702 байта**; 120 px — **126 780**. Сумма всех 21 WebP-файлов — **328 240**; это не передача при одном открытии страницы.
- Полные размеры сохранены у всех семи изображений. Варианты не растянуты в квадрат: отклонение высоты от пропорционального уменьшения не превышает 0,5 px; все редакционные `*-source.png` по-прежнему 1254×1254.

## Побайтовая проверка RGBA

WebP декодирован через `dwebp` в PNG, затем оба изображения прочитаны как сырые **8-bit RGBA**. Сравнивались все четыре канала каждого пикселя, без маски по alpha, цветового преобразования или композиции на фоне.

- Полноразмерный WebP сравнен с исходным runtime PNG; варианты 72/120 — с соответствующим промежуточным Lanczos PNG32, а не с полноразмерным изображением.
- **Все 21 сравнение: 0 различающихся байтов.** Длина буфера каждого файла проверена как `width × height × 4`; общая длина полноразмерных сравнений — 561 600 байт.
- Для полноразмерных файлов ниже приведены длина RGBA и число полностью прозрачных пикселей; в скобках — сколько из них имеют ненулевой RGB. Их значения тоже сохранены:
  - Animals — 82 944 байта; 12 825 прозрачных (0).
  - Apple — 82 944; 10 860 (0).
  - Construction — 81 216; 9 600 (1 341).
  - Fish — 82 944; 12 767 (0).
  - Foodtruck — 73 728; 7 348 (614).
  - Kpp — 78 912; 8 871 (489).
  - Titanic — 78 912; 10 136 (0).

## SHA-256 входов

Все 14 PNG совпали с содержимым Git HEAD `64e4169eaeabb03d1e6e2c2a3b3aee42a9cbf0bb` и со своими хешами до конвертации. Повторная проверка после создания WebP подтвердила неизменность. В каждой паре: runtime PNG, затем редакционный source PNG.

- `Animals.png`: `d535bae08d88b994d23a1edc20a8ac6477b0a4685192cb5227a923b667ea2c36`.
  - `Animals-source.png`: `e3b3f11cd89246dec8876b60c214cea3668eded0a2a1f07b919add5d601b0274`.
- `Apple.png`: `72300429a12ee83b24eb91ba19b55209519995d68c9e5acad5bff1133bd6423b`.
  - `Apple-source.png`: `5ac15d4c7ca757352e772f144389b754244f8047e6528073c60a4181aadb2d77`.
- `Construction.png`: `0d1a2dc6773c7dc4d7109aebf48cdf36f9811a98c0694190026ba040f30a4dc0`.
  - `Construction-source.png`: `b5d083c499804563b6de57d39b820eb5068cfe22b36da228262a2c8af73d3662`.
- `Fish.png`: `fcd7d0f1db9a1852830c61917a23fcba8b6607cd8570819ddebbc26bf1100e48`.
  - `Fish-source.png`: `9338826307a74bd113dc835d3e19007f8dd013e087bb7a1ef077a70e2238c067`.
- `Foodtruck.png`: `634e23405e1c12972ee974c95a88b3a303924168973f7567c909b2eb93d83ab7`.
  - `Foodtruck-source.png`: `74a84500d3b3e2bca690a7ebef9a732323e5f1069110dd345562af482d7d186f`.
- `Kpp.png`: `3f92d57a876de1837899eff07df93cc5b2f97447f458aaf71698cf3bd662b653`.
  - `Kpp-source.png`: `dc262f3f6d6ce58a2d3d0fe50dea120c94f7e858d7c53521a5e12c1013389471`.
- `Titanic.png`: `d9ecc07a66471ae38f1ea7cddcc077596c3dc139958a4bec525dcc88e489a1ea`.
  - `Titanic-source.png`: `b511c26c1e9ba52a44b22f280c30cc205ea5a05ab02f3f3e7e2ff2ac4e083abc`.

Блокеров подготовки ресурсов нет. Визуальная и сетевая приёмка на реальных поверхностях приложения остаётся задачами 3.1/3.2; побайтовая проверка кодирования не заменяет оценку качества после уменьшения.
