#!/bin/sh

set -eu

src=${1:?config path is required}
name=${2:?site name is required}
extra=
if [ "$name" = kpshelkovo-online ]; then
  extra="/tmp/$name-api-contract-headers.conf.new"
fi
dst="/etc/nginx/sites-available/$name"
link="/etc/nginx/sites-enabled/$name"
extra_dst="/etc/nginx/sites-available/$name-api-contract-headers.conf"
dir=$(mktemp -d)
bak="$dir/$name.conf.bak"
extra_bak="$dir/$name-api-contract-headers.conf.bak"
old="$dir/$name.enabled.bak"
target="$dst"
had_dst=false
had_extra=false
state=missing
rollback_needed=false
reload_attempted=false

undo() {
  if [ "$had_dst" = true ]; then
    install -m 644 "$bak" "$dst"
  else
    rm -f "$dst"
  fi

  if [ -n "$extra" ]; then
    if [ "$had_extra" = true ]; then
      install -m 644 "$extra_bak" "$extra_dst"
    else
      rm -f "$extra_dst"
    fi
  fi

  if [ "$state" = file ]; then
    install -m 644 "$old" "$link"
  elif [ "$state" = symlink ]; then
    ln -sfn "$target" "$link"
  else
    rm -f "$link"
  fi
}

finish() {
  status=$?
  trap - EXIT

  if [ "$rollback_needed" = true ]; then
    set +e
    undo
    nginx -t
    valid=$?
    if [ "$reload_attempted" = true ] && [ "$valid" -eq 0 ]; then
      systemctl reload nginx
      if [ "$?" -eq 0 ]; then
        systemctl is-active --quiet nginx
      fi
    fi
    set -e
  fi

  rm -rf "$dir"
  exit "$status"
}

trap finish EXIT

test -f "$src"
if [ -n "$extra" ]; then
  test -f "$extra"
fi

if [ "$name" = media-kpshelkovo-online ]; then
  owner=${SUDO_USER:-root}
  group=$(id -gn "$owner")

  install -d -o root -g root -m 0755 /var/cache/nginx
  install -d -o www-data -g www-data -m 0750 /var/cache/nginx/media-kpshelkovo-online
  install -d -o "$owner" -g "$group" -m 0755 /var/www/media-kpshelkovo-online
fi

if [ -f "$dst" ]; then
  cp "$dst" "$bak"
  had_dst=true
fi

if [ -n "$extra" ] && [ -f "$extra_dst" ]; then
  cp "$extra_dst" "$extra_bak"
  had_extra=true
fi

if [ -L "$link" ]; then
  state=symlink
  target=$(readlink "$link")
elif [ -f "$link" ]; then
  state=file
  cp "$link" "$old"
fi

rollback_needed=true
if [ -n "$extra" ]; then
  install -m 644 "$extra" "$extra_dst"
fi
install -m 644 "$src" "$dst"
ln -sfn "$dst" "$link"

nginx -t
reload_attempted=true
systemctl reload nginx
systemctl is-active --quiet nginx
rollback_needed=false
