#!/usr/bin/env bash
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
usage() {
  echo "Usage: bash audio.sh giga|whisper SOURCE.wav WORK START_SECONDS [...]
       bash audio.sh diarize SOURCE.wav WORK [START_SECONDS]
       bash audio.sh longform SOURCE.wav WORK" >&2
  exit 2
}
[[ $# -ge 3 ]] || usage
mode=$1 source=$2 work=$3
shift 3
[[ -f "$source" ]] || { echo "Missing WAV: $source" >&2; exit 1; }
giga='git+https://github.com/salute-developers/GigaAM.git@7447938d791c4f3e643386ee22c33777004293a5'
case "$mode" in
  giga) dep="gigaam[torch] @ $giga";;
  whisper) dep=mlx-whisper;;
  diarize) dep='pyannote.audio>=4,<5'; [[ $# -le 1 ]] || usage;;
  longform) dep="gigaam[longform] @ $giga"; [[ $# -eq 0 ]] || usage;;
  *) usage;;
esac
if [[ "$mode" == giga || "$mode" == whisper ]]; then [[ $# -gt 0 ]] || usage; fi
for start in "$@"; do [[ "$start" =~ ^[0-9]+$ ]] || usage; done
mkdir -p "$work"
envdir="$work/.venv-$mode"
[[ -x "$envdir/bin/python" ]] || uv venv --python "$(command -v python3.11)" "$envdir"
uv pip install --python "$envdir/bin/python" "$dep"
if [[ "$mode" == longform && "$OSTYPE" == darwin* ]] && command -v nix >/dev/null; then
  # TorchCodec's macOS wheel searches Homebrew; Nix uses a separate lib output.
  ffmpeg_lib=$(nix build --no-link --print-out-paths 'nixpkgs#ffmpeg_8.lib')
  export DYLD_LIBRARY_PATH="$ffmpeg_lib/lib${DYLD_LIBRARY_PATH:+:$DYLD_LIBRARY_PATH}"
fi
if [[ "$mode" == longform || ( "$mode" == diarize && $# == 0 ) ]]; then
  "$envdir/bin/python" "$here/audio.py" "$mode" "$source" 0 "$work/full.$mode.json"
else
  duration=24
  [[ "$mode" != diarize ]] || duration=180
  for start in "$@"; do
    clip="$work/clip-$start-${duration}s.wav"
    ffmpeg -nostdin -v error -y -ss "$start" -i "$source" -t "$duration" -c:a pcm_s16le "$clip"
    "$envdir/bin/python" "$here/audio.py" "$mode" "$clip" "$start" "${clip%.wav}.$mode.json"
  done
fi
