import json
import os
import sys
import wave
from getpass import getpass
from pathlib import Path

mode, source, offset, destination = sys.argv[1:]
offset = int(offset)
with wave.open(source) as wav:
    if (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) != (1, 2, 16000):
        sys.exit("Expected mono 16 kHz PCM s16 WAV")
    if not wav.getnframes():
        sys.exit("Empty WAV; check clip start")


def hf_token():
    from huggingface_hub import get_token

    return get_token() or getpass("Hugging Face read token: ")


def timed(start, end, **fields):
    return dict(start=round(offset + start, 3), end=round(offset + end, 3), **fields)


if mode == "diarize":
    import numpy as np
    import torch
    from pyannote.audio import Pipeline
    from pyannote.audio.pipelines.utils.hook import ProgressHook

    pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-community-1", token=hf_token())
    with wave.open(source) as wav:
        samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2")
    waveform = torch.from_numpy(samples.astype("float32") / 32768).unsqueeze(0)
    del samples
    with ProgressHook() as hook:
        result = pipeline({"waveform": waveform, "sample_rate": 16000}, hook=hook)
    payload = {
        name: [timed(t.start, t.end, speaker=s) for t, s in annotation]
        for name, annotation in (
            ("exclusive", result.exclusive_speaker_diarization),
            ("overlap_aware", result.speaker_diarization),
        )
    }
elif mode == "whisper":
    import mlx_whisper

    result = mlx_whisper.transcribe(source, path_or_hf_repo="mlx-community/whisper-large-v3-mlx",
                                    language="ru", word_timestamps=True)
    payload = {"text": result["text"], "words": [
        timed(w["start"], w["end"], text=w["word"])
        for seg in result["segments"] for w in seg["words"]
    ]}
else:
    import gigaam

    if mode == "longform":
        print("Загрузка GigaAM…", flush=True)
    model = gigaam.load_model("v3_e2e_rnnt", device="cpu")
    if mode == "longform":
        from longform_progress import transcribe

        os.environ["HF_TOKEN"] = hf_token()
        result = transcribe(model, source, offset)
        payload = {"segments": [timed(s.start, s.end, text=s.text, words=[
            timed(w.start, w.end, text=w.text) for w in s.words or []
        ]) for s in result]}
    else:
        result = model.transcribe(source, word_timestamps=True)
        payload = {"text": result.text, "words": [
            timed(w.start, w.end, text=w.text) for w in result.words or []
        ]}

Path(destination).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(payload.get("text", destination))
