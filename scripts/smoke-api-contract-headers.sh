#!/bin/sh

set -eu

origin=${1:-https://kpshelkovo.online}
contract_origin=${2:-$origin}
origin=${origin%/}
contract_origin=${contract_origin%/}
headers=$(mktemp)
body=$(mktemp)
insecure=

if [ "${API_CONTRACT_INSECURE:-}" = 1 ]; then
  insecure=--insecure
fi

clean() {
  rm -f "$headers" "$body"
}

trap clean EXIT

header_values() {
  name=$1
  awk -v name="$name" '
    {
      line = $0
      sub(/\r$/, "", line)
      separator = index(line, ":")
      if (separator > 0 && tolower(substr(line, 1, separator - 1)) == tolower(name)) {
        value = substr(line, separator + 1)
        sub(/^[[:space:]]+/, "", value)
        print value
      }
    }
  ' "$headers"
}

request() {
  method=$1
  path=$2
  expected_type=$3
  expected_cache=$4
  expected_link=$5

  rm -f "$headers" "$body"
  if [ "$method" = HEAD ]; then
    curl $insecure --silent --show-error --fail --head \
      --dump-header "$headers" --output /dev/null "$origin$path"
  else
    curl $insecure --silent --show-error --fail \
      --dump-header "$headers" --output "$body" "$origin$path"
    test -s "$body"
  fi

  test "$(header_values Content-Type)" = "$expected_type"
  test "$(header_values Cache-Control)" = "$expected_cache"
  test "$(header_values Link)" = "$expected_link"
  test "$(header_values Link | awk 'END { print NR }')" = 1
  test "$(header_values Strict-Transport-Security)" = "max-age=31536000"
  test "$(header_values X-Content-Type-Options)" = nosniff
  test "$(header_values X-Frame-Options)" = SAMEORIGIN
  test "$(header_values Referrer-Policy)" = strict-origin-when-cross-origin
  test "$(header_values Cross-Origin-Opener-Policy)" = same-origin
  test -n "$(header_values Content-Security-Policy)"
}

check_section() {
  data=$1
  schema=$2
  openapi=$3
  catalog=$4
  data_cache=$5
  contract_cache="public,max-age=3600,stale-while-revalidate=600"
  link="<$contract_origin$schema>; rel=\"service-desc\"; type=\"application/schema+json\", <$contract_origin$openapi>; rel=\"service-desc\"; type=\"application/vnd.oai.openapi+json\", <$contract_origin$catalog>; rel=\"api-catalog\"; type=\"application/linkset+json\"; profile=\"https://www.rfc-editor.org/info/rfc9727\""

  for method in GET HEAD; do
    request "$method" "$data" "application/json; charset=utf-8" "$data_cache" "$link"
    request "$method" "$schema" "application/schema+json; charset=utf-8" "$contract_cache" "$link"
    request "$method" "$openapi" "application/vnd.oai.openapi+json; charset=utf-8" "$contract_cache" "$link"
  done
}

check_section \
  /815/compare/data/settlements.json \
  /815/compare/schemas/settlements.schema.json \
  /815/compare/openapi/settlements.openapi.json \
  /815/compare/.well-known/api-catalog \
  public,max-age=300,stale-while-revalidate=300

check_section \
  /news/data/articles.json \
  /news/schemas/articles.schema.json \
  /news/openapi/articles.openapi.json \
  /news/.well-known/api-catalog \
  public,max-age=3600,stale-while-revalidate=600

check_section \
  /status/data/status.json \
  /status/schemas/status.schema.json \
  /status/openapi/status.openapi.json \
  /status/.well-known/api-catalog \
  public,max-age=60,stale-while-revalidate=300

check_section \
  /people/data/people.json \
  /people/schemas/people.schema.json \
  /people/openapi/people.openapi.json \
  /people/.well-known/api-catalog \
  public,max-age=3600,stale-while-revalidate=600

check_section \
  /815/regulation/data/estimate-2026.json \
  /815/regulation/schemas/estimate-2026.schema.json \
  /815/regulation/openapi/estimate-2026.openapi.json \
  /815/regulation/.well-known/api-catalog \
  public,max-age=3600,stale-while-revalidate=600

printf '%s\n' 'API contract GET/HEAD headers are valid for all five sections.'
