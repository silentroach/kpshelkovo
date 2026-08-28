#!/usr/bin/env bash

set -euo pipefail

readonly repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly build_dir="$repo_root/node_modules/.cache/font-subsets"
readonly output_dir="$repo_root/packages/ui/fonts"
readonly source_revision="ed7143b8f0c9587f9dcfbcdf5b34ec1a7bc07fca"
readonly source_base="https://raw.githubusercontent.com/google/fonts/$source_revision/ofl"
readonly fonttools_version="4.59.1"
readonly brotli_version="1.1.0"
readonly shared_unicodes="U+0020-007E,U+00A0-00FF,U+0301,U+0401-040C,U+040E-044F,U+0451-045C,U+045E-045F,U+0490-0491,U+04B0-04B1,U+2013-2014,U+2018-201A,U+201C-201E,U+2020-2022,U+2026,U+2030,U+2039-203A,U+2044,U+20AC,U+20BD,U+2116,U+2122,U+2212"
readonly fira_sans_unicodes="$shared_unicodes,U+2190-2193"

verify_sha256() {
  local expected="$1"
  local file="$2"
  local actual
  actual="$(shasum -a 256 "$file" | cut -d ' ' -f 1)"

  if [[ "$actual" != "$expected" ]]; then
    printf 'Checksum mismatch for %s\nExpected: %s\nActual:   %s\n' "$file" "$expected" "$actual" >&2
    exit 1
  fi
}

download_font() {
  local path="$1"
  local checksum="$2"
  local target="$build_dir/$(basename "$path")"

  curl --fail --location --silent --show-error --output "$target" "$source_base/$path"
  verify_sha256 "$checksum" "$target"
}

build_subset() {
  local source_file="$1"
  local output_file="$2"
  local unicodes="$3"

  "$build_dir/venv/bin/pyftsubset" \
    "$build_dir/$source_file" \
    --output-file="$build_dir/$output_file" \
    --flavor=woff2 \
    --unicodes="$unicodes" \
    --no-ignore-missing-unicodes \
    --no-recalc-timestamp
}

rename_pt_serif_subset() {
  local font_file="$build_dir/shelkovo-serif-700-normal.woff2"

  "$build_dir/venv/bin/python" - "$font_file" <<'PY'
import sys

from fontTools.ttLib import TTFont

font_path = sys.argv[1]
font = TTFont(font_path, recalcTimestamp=False)
replacement_names = {
    1: "Shelkovo Serif",
    3: "Shelkovo Serif Bold 1.000",
    4: "Shelkovo Serif Bold",
    6: "ShelkovoSerif-Bold",
    16: "Shelkovo Serif",
    21: "Shelkovo Serif",
}

for record in font["name"].names:
    if replacement := replacement_names.get(record.nameID):
        record.string = replacement.encode(record.getEncoding())

font.save(font_path, reorderTables=False)
PY
}

mkdir -p "$build_dir" "$output_dir"
python3 -m venv --clear "$build_dir/venv"
"$build_dir/venv/bin/pip" install \
  --disable-pip-version-check \
  --no-deps \
  "fonttools==$fonttools_version" \
  "brotli==$brotli_version"

download_font \
  "firasans/FiraSans-Regular.ttf" \
  "c29556a2719bf613ef3d5e070e40d903a8965d9c081beca1375dc1e6e0f93c23"
download_font \
  "firasans/FiraSans-SemiBold.ttf" \
  "db0321f83eb3e9f527b8af384a1b3fefdc1039cf2b06fd39b3f61492bda9561c"
download_font \
  "ptserif/PT_Serif-Web-Bold.ttf" \
  "038ba7336bd7ea14f12ad155bed51a4345cac5153275d521dec3ba04021c526e"

build_subset \
  "FiraSans-Regular.ttf" \
  "fira-sans-400-normal.woff2" \
  "$fira_sans_unicodes"
build_subset \
  "FiraSans-SemiBold.ttf" \
  "fira-sans-600-normal.woff2" \
  "$fira_sans_unicodes"
build_subset \
  "PT_Serif-Web-Bold.ttf" \
  "shelkovo-serif-700-normal.woff2" \
  "$shared_unicodes"
rename_pt_serif_subset

mv "$build_dir/fira-sans-400-normal.woff2" "$output_dir/"
mv "$build_dir/fira-sans-600-normal.woff2" "$output_dir/"
mv "$build_dir/shelkovo-serif-700-normal.woff2" "$output_dir/"

wc -c "$output_dir"/*.woff2
