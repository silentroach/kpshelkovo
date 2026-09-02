#!/bin/sh

set -eu

src=${1:?service drop-in path is required}
dir=/etc/systemd/system/nginx.service.d
dst="$dir/restart.conf"
bak=$(mktemp)
had_dst=false

clean() {
  rm -f "$bak"
}

undo() {
  if [ "$had_dst" = true ]; then
    install -o root -g root -m 644 "$bak" "$dst"
  else
    rm -f "$dst"
  fi

  systemctl daemon-reload || true
  exit 1
}

trap clean EXIT

test -f "$src"

if [ -f "$dst" ]; then
  cp "$dst" "$bak"
  had_dst=true
fi

install -d -o root -g root -m 755 "$dir"
install -o root -g root -m 644 "$src" "$dst"

systemctl daemon-reload || undo

restart=$(systemctl show nginx --property=Restart --value) || undo
restart_delay=$(systemctl show nginx --property=RestartUSec --value) || undo
after=$(systemctl show nginx --property=After --value) || undo
wants=$(systemctl show nginx --property=Wants --value) || undo

[ "$restart" = on-failure ] || undo
[ "$restart_delay" = 10s ] || undo

case " $after " in
  *" systemd-resolved.service "*) ;;
  *) undo ;;
esac

case " $wants " in
  *" systemd-resolved.service "*) ;;
  *) undo ;;
esac
