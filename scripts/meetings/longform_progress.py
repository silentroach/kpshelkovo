"""Progress adapter for the GigaAM revision pinned in audio.sh."""
import sys
from datetime import timedelta
from functools import partial
from time import monotonic
from unittest.mock import patch


def clock(seconds):
    return str(timedelta(seconds=round(seconds)))


def transcribe(model, source, offset):
    from gigaam import vad_utils
    from pyannote.audio.pipelines.utils.hook import ProgressHook

    segment = vad_utils.segment_audio_file
    pipeline = vad_utils.get_pipeline
    decode = model._decode
    bounds = []
    done = 0
    started = 0

    def find_speech(*args, **kwargs):
        nonlocal bounds, started
        print("1/2 Поиск речи (оценка времени только для этого этапа)", flush=True)
        with ProgressHook() as hook:
            def pipeline_with_progress(*args, **kwargs):
                return partial(pipeline(*args, **kwargs), hook=hook)

            with patch.object(vad_utils, "get_pipeline", pipeline_with_progress):
                result = segment(*args, **kwargs)
        bounds = result[1]
        print(f"2/2 Распознавание: {len(bounds)} фрагментов", flush=True)
        started = monotonic()
        return result

    def decode_batch(*args, **kwargs):
        nonlocal done
        batch = decode(*args, **kwargs)
        done += len(batch)
        if done:
            eta = (monotonic() - started) * (len(bounds) - done) / done
            print(f"Распознано {done}/{len(bounds)} ({done / len(bounds):.0%})"
                  f" · до {clock(offset + bounds[done - 1][1])} по записи"
                  f" · осталось ≈ {clock(eta)}", file=sys.stderr, flush=True)
        return batch

    with patch.object(vad_utils, "segment_audio_file", find_speech), \
         patch.object(model, "_decode", decode_batch):
        return model.transcribe_longform(source, word_timestamps=True)
