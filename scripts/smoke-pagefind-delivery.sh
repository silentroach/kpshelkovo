#!/bin/sh

set -eu

base_url=${1:?production base URL is required}
artifact_root=${2:-dist/www}
search_dir="$artifact_root/search"
stable_cache=public,max-age=60,must-revalidate
immutable_cache=public,max-age=31536000,immutable
tmp=$(mktemp -d)

cleanup() {
  rm -rf "$tmp"
}

fail() {
  printf 'Pagefind delivery smoke failed: %s\n' "$*" >&2
  exit 1
}

pick_file() {
  for candidate do
    if [ -f "$candidate" ]; then
      printf '%s\n' "${candidate#"$search_dir"/}"
      return
    fi
  done

  fail "no artifact matched $*"
}

pick_wasm() {
  for candidate in "$search_dir"/wasm.*.pagefind; do
    if [ -f "$candidate" ] && [ "${candidate##*/}" != wasm.unknown.pagefind ]; then
      printf '%s\n' "${candidate#"$search_dir"/}"
      return
    fi
  done

  pick_file "$search_dir"/wasm.*.pagefind
}

header_value() {
  awk -v wanted="$1" '
    {
      line = $0
      sub(/\r$/, "", line)
      separator = index(line, ":")
      if (separator == 0) next

      name = tolower(substr(line, 1, separator - 1))
      if (name != tolower(wanted)) next

      value = substr(line, separator + 1)
      sub(/^[[:space:]]+/, "", value)
      print value
      exit
    }
  ' "$2"
}

assert_header() {
  actual=$(header_value "$2" "$1")
  [ "$actual" = "$3" ] || fail "$4: expected $2 '$3', got '${actual:-missing}'"
}

assert_header_present() {
  actual=$(header_value "$2" "$1")
  [ -n "$actual" ] || fail "$3: missing $2"
}

assert_content_type() {
  actual=$(header_value Content-Type "$1")
  case "$actual" in
    "$2"|"$2;"*) ;;
    *) fail "$3: expected Content-Type '$2', got '${actual:-missing}'" ;;
  esac
}

check_asset() {
  relative=$1
  expected_type=$2
  expected_cache=$3
  headers="$tmp/headers"
  url="$base_url/search/$relative"

  [ -f "$search_dir/$relative" ] || fail "artifact is missing search/$relative"
  : > "$headers"

  status=$(curl \
    --silent \
    --show-error \
    --retry 4 \
    --retry-delay 2 \
    --retry-connrefused \
    --connect-timeout 10 \
    --max-time 30 \
    --dump-header "$headers" \
    --output /dev/null \
    --write-out '%{http_code}' \
    "$url")

  [ "$status" = 200 ] || fail "search/$relative returned HTTP $status"
  assert_header "$headers" Strict-Transport-Security max-age=31536000 "$relative"
  assert_header "$headers" X-Content-Type-Options nosniff "$relative"
  assert_header "$headers" X-Frame-Options SAMEORIGIN "$relative"
  assert_header "$headers" Referrer-Policy strict-origin-when-cross-origin "$relative"
  assert_header "$headers" Cross-Origin-Opener-Policy same-origin "$relative"
  assert_header_present "$headers" Content-Security-Policy "$relative"
  assert_header "$headers" Cache-Control "$expected_cache" "$relative"
  assert_content_type "$headers" "$expected_type" "$relative"

  printf 'Verified /search/%s\n' "$relative"
}

trap cleanup EXIT

case "$base_url" in
  http://*|https://*) base_url=${base_url%/} ;;
  *) fail "base URL must start with http:// or https://" ;;
esac

[ -d "$search_dir" ] || fail "artifact directory does not exist: $search_dir"

wasm=$(pick_wasm)
metadata=$(pick_file "$search_dir"/pagefind.*_*.pf_meta)
index_chunk=$(pick_file "$search_dir"/index/*_*.pf_index)
filter_chunk=$(pick_file "$search_dir"/filter/*_*.pf_filter)
fragment=$(pick_file "$search_dir"/fragment/*_*.pf_fragment)

check_asset pagefind.js application/javascript "$stable_cache"
check_asset pagefind-worker.js application/javascript "$stable_cache"
check_asset pagefind-entry.json application/json "$stable_cache"
check_asset pagefind-ui.css text/css "$stable_cache"
check_asset "$wasm" application/octet-stream "$stable_cache"
check_asset "$metadata" application/octet-stream "$immutable_cache"
check_asset "$index_chunk" application/octet-stream "$immutable_cache"
check_asset "$filter_chunk" application/octet-stream "$immutable_cache"
check_asset "$fragment" application/octet-stream "$immutable_cache"
