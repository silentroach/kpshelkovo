#!/bin/sh

set -eu

src=${1:?config path is required}
name=${2:?site name is required}
dst="/etc/nginx/sites-available/$name"
link="/etc/nginx/sites-enabled/$name"
dir=$(mktemp -d)
bak="$dir/$name.conf.bak"
old="$dir/$name.enabled.bak"
headers_src="$(dirname "$src")/security.conf.new"
headers_dst=/etc/nginx/kps/security.conf
headers_bak="$dir/security-headers.conf.bak"
redirects_src="$(dirname "$src")/events-redirects.conf.new"
redirects_dst=/etc/nginx/kps/events-redirects.conf
redirects_bak="$dir/events-redirects.conf.bak"
target="$dst"
had_dst=false
state=missing
rollback=false

clean() {
  result=$?
  trap - EXIT
  if [ "$rollback" = true ]; then
    undo
    if nginx -t; then
      systemctl reload nginx
    fi
  fi
  rm -rf "$dir"
  exit "$result"
}

undo() {
  # Restore includes and the site together after any failed install, check or reload.
  if [ "$name" = kpshelkovo-online ]; then
    if [ -f "$headers_bak" ]; then
      install -m 644 "$headers_bak" "$headers_dst"
    else
      rm -f "$headers_dst"
    fi
    if [ -f "$redirects_bak" ]; then
      install -m 644 "$redirects_bak" "$redirects_dst"
    else
      rm -f "$redirects_dst"
    fi
  fi

  if [ "$had_dst" = true ]; then
    install -m 644 "$bak" "$dst"
  else
    rm -f "$dst"
  fi

  if [ "$state" = file ]; then
    rm -f "$link"
    install -m 644 "$old" "$link"
  elif [ "$state" = symlink ]; then
    ln -sfn "$target" "$link"
  else
    rm -f "$link"
  fi
}

trap clean EXIT
trap 'exit 1' HUP INT TERM

test -f "$src"

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

if [ -L "$link" ]; then
  state=symlink
  target=$(readlink "$link")
elif [ -f "$link" ]; then
  state=file
  cp "$link" "$old"
fi

# Validate inputs and snapshot every destination before changing any of them.
if [ "$name" = kpshelkovo-online ]; then
  test -f "$headers_src"
  test -f "$redirects_src"
  if [ -f "$headers_dst" ]; then
    cp "$headers_dst" "$headers_bak"
  fi
  if [ -f "$redirects_dst" ]; then
    cp "$redirects_dst" "$redirects_bak"
  fi
fi

rollback=true
install -d -m 755 /etc/nginx/sites-available /etc/nginx/sites-enabled
if [ "$name" = kpshelkovo-online ]; then
  install -d -m 755 /etc/nginx/kps
  install -m 644 "$headers_src" "$headers_dst"
  install -m 644 "$redirects_src" "$redirects_dst"
fi
install -m 644 "$src" "$dst"
ln -sfn "$dst" "$link"

nginx -t
systemctl reload nginx
systemctl is-active --quiet nginx
rollback=false
