# Speech Synthesis

`PHPolygon\Audio\Speech` generates voice lines **offline**, at build time: every key of the
`{locale}.json` translation files that matches `speech.keys` is spoken in each locale with a
cloned voice and written as `{output}/{locale}/{key}.flac` (44.1 kHz mono, run through
`VoiceChain`, normalised to -16 LUFS). The synthesizer is
[Chatterbox Multilingual 0.1.7](https://github.com/resemble-ai/chatterbox) (MIT), run as a Python
worker process.

The generated files are local build inputs, not Git content: list `output` in `.gitignore` and in
`resources.external`.

## Configuration

```json
"speech": {
  "locales": "resources/lang",
  "output": "resources/voice",
  "keys": ["dialog.*"],
  "only": [],
  "voices": {
    "narrator": { "reference": "resources/voice-ref/narrator.wav" },
    "guide": { "reference": null, "profile": { "pitch": 0.8 } },
    "robot": {
      "reference": "resources/voice-ref/robot.wav",
      "keys": ["dialog.robot.*"],
      "seed": 7,
      "profile": { "crush": 0.2 },
      "params": { "temperature": 0.6, "cfmSteps": 16, "referenceStart": 2.5, "referenceLength": 8 }
    }
  },
  "build": "generate",
  "runner": "auto",
  "gpu": false,
  "workers": ["cuda", "cuda", "cpu", "ssh://me@worker.local?device=mps"],
  "device": "auto",
  "cpuThreads": null,
  "remoteRetries": 5
}
```

| Key | Default | Meaning |
|---|---|---|
| `locales` | `resources/lang` | Directory of `{locale}.json` translation files |
| `output` | `resources/voice` | Where `{locale}/{key}.flac` and `speech.lock.json` are written |
| `keys` | - | `fnmatch` patterns of the spoken keys |
| `only` | `[]` | Locales to generate; empty = every translation file |
| `voices` | - | The first voice whose `keys` match speaks a line, else a voice without `keys` |
| `build` | `generate` | What `phpolygon build` does: `generate` missing lines, `check` (fail on missing/stale) or `off` |
| `runner` | `auto` | `auto` (native Python environment, else Docker), `native` or `docker` |
| `gpu` | `false` | Use CUDA (Docker: `--gpus all`) |
| `workers` | `1` | An int (that many on `device`) or a list with one device per worker: `cuda`, `cpu`, `mps`, `ssh://...` |
| `device` | `auto` | `auto`, `cuda`, `cpu`, `mps` |
| `cpuThreads` | `null` | Threads per CPU worker (null = share half the cores next to GPU workers, all cores without them) |
| `remoteRetries` | `5` | Reconnect attempts of a remote worker in a row without a finished line |

A voice's `reference` is a WAV to clone; `null` or absent uses the synthesizer's built-in voice
(voices on it differ only by seed, exaggeration, cfg weight, `params` and `profile`). `profile`
is a [`VoiceProfile`](/guide/audio#voice-processing) applied after synthesis (pitch, formant,
tempo, tilt, breath, vocoder, crush).

## Commands

```bash
vendor/bin/phpolygon speech:setup                    # Python env in ~/.phpolygon/speech/ (uv, or Python 3.10-3.12)
vendor/bin/phpolygon speech:setup --docker [--gpu]   # or the Docker image (CPU / CUDA)
vendor/bin/phpolygon speech:setup --remote=ssh://me@worker.local   # environment on a worker host
vendor/bin/phpolygon speech:status                   # per locale: current / missing / stale / unsupported / unspeakable
vendor/bin/phpolygon speech:sync [--locale=de,en] [--key=dialog.*] [--check]
```

`speech:sync` compares every line with `speech.lock.json`, generates missing and stale lines and
saves the manifest after each one, so an interrupted run keeps its progress. `phpolygon build`
runs the same sync before its targets (per `build`).

## Voice parameters

Fine controls go into `speech.voices.<voice>.params` (camelCase). Unknown keys, wrong types and
values out of range are errors; an unset field keeps the model's default.
`ChatterboxSynthesizer::parameterSchema()` returns the same table for editor UIs.

| Group | Parameter | Default | Range |
|---|---|---|---|
| voice | `seed` (on the voice) | 0 | 0 - 4294967295 |
| voice | `exaggeration` (on the voice) | 0.5 | 0 - 2 |
| voice | `cfgWeight` (on the voice) | 0.5 | 0 - 1 |
| sampling | `temperature` | 0.8 | 0.05 - 2 |
| sampling | `topP` | 1.0 | 0.01 - 1 |
| sampling | `minP` | 0.05 | 0 - 1 |
| sampling | `repetitionPenalty` | 2.0 | 1 - 3 |
| sampling | `maxNewTokens` (25 tokens/s; longer lines are cut) | 1000 | 1 - 4096 |
| decoder | `cfmSteps` (flow-matching steps) | 10 | 1 - 50 |
| reference | `referenceStart` / `referenceLength` (excerpt of the WAV in seconds) | 0 / whole file | 0 - 3600 / 0.5 - 3600 |
| reference | `promptSeconds` (speech prompt, capped at 6 s) | 6 | 0.5 - 6 |
| reference | `voiceSeconds` (timbre reference) | 10 | 0.5 - 10 |
| output | `watermark` | true | bool |

- The reference group needs a `reference` WAV.
- There is **no speaking-rate control** in Chatterbox 0.1.7 - use `profile.tempo`.
- With no field set the output is identical to the model's own `generate()` (same seed). The
  worker is pinned to 0.1.7: on another installed version a job that sets one of these fields
  fails with a clear message.
- Chatterbox embeds an inaudible watermark in every file. `watermark: false` skips it - only
  where your own licence and AI-disclosure policy allow it.

## Languages

Chatterbox speaks 22 of the 31 Steam languages; not Bulgarian, Czech, Hungarian, Indonesian,
Romanian, Thai, Ukrainian, Vietnamese and Traditional Chinese. Texts with `:placeholders` or
plural forms (`a|b`) are not spoken either - they are only known at runtime. `speech:status`
lists such lines; they never fail a build.

## Cache key

A line is regenerated when any of these change: the sync version, `VoiceChain::CHAIN_VERSION`,
the synthesizer id, language, text, the reference WAV's hash, seed, exaggeration, cfg weight, the
profile fingerprint and the `params` that are set (only when one is set, so voices without params
keep their cached lines).

## Workers

Chatterbox generates token by token with batch size 1, so one instance leaves a GPU mostly idle;
several worker processes, each with its own model, fill it.

- **Budget:** about 3.3 GiB VRAM per CUDA worker (not checked - an 8 GiB card fits two), system
  RAM about 4.5 GB per CPU worker and 2 GB per GPU worker. Free RAM is checked before the start;
  workers are dropped (CPU first, at least one stays) with a warning when it is short.
- **Scheduling:** one shared queue, one job in flight per worker. A worker keeps its reference
  voice while the queue has more lines for it (conditioning is expensive); near the end a slow
  worker is left idle when the others finish the queue first.
- **Docker:** one container per worker; every container loads its own model.
- **Remote workers** (`ssh://user@host[:port][?device=mps&python=/path&workers=2]`): SSH must log
  in without a prompt (key or agent). `speech:setup --remote=...` installs the environment on the
  host. Reference WAVs travel inline and generated audio comes back in the result line; the rest
  of the pipeline sees no difference. A remote worker that drops puts its line back into the
  queue and reconnects with a backoff of 5, 15, 45, then 120 s, up to `remoteRetries` attempts
  in a row without a finished line.
- **Out of device memory:** the worker frees its cache and retries the line once, then exits with
  code 75 and is restarted like a dropped remote worker; its line goes back to the queue. Workers
  also recycle themselves once more than 60 % of the device memory is in use.
- Seeds are fixed, but CPU, MPS and CUDA still sound slightly different.

## Environment overrides

| Variable | Overrides |
|---|---|
| `PHPOLYGON_SPEECH` | `build` (`generate`, `check`, `off`) |
| `PHPOLYGON_SPEECH_RUNNER` | `runner` |
| `PHPOLYGON_SPEECH_GPU` | `gpu` |
| `PHPOLYGON_SPEECH_PYTHON` | Python interpreter of the native runner |
| `PHPOLYGON_SPEECH_WORKERS` | `workers` (`2` or `cuda,cuda,cpu,ssh://...`) |
| `PHPOLYGON_SPEECH_DEVICE` | `device` |
| `PHPOLYGON_SPEECH_CPU_THREADS` | `cpuThreads` |
| `PHPOLYGON_SPEECH_REMOTE_RETRIES` | `remoteRetries` |

Inside the cross-build container (no Python, no Docker) generate on the host first; the
bind-mounted files then pass the sync.

## Using the lines in the game

`SpeechFiles::path()` / `SpeechFiles::find()` locate a line the way the generator wrote it. The
FLAC files can be re-encoded to Opus or Vorbis in a build hook (see
[Compressed audio](/guide/audio#compressed-audio-opus-vorbis)); `VioAudioBackend` then plays the
smallest file it can decode.

Tools without `build.json` `speech` can drive the synthesizer directly through
`ChatterboxSynthesizer::fromOptions()`.

::: tip Steam
Steam's content survey asks about AI-generated content. Declare synthesized voices there.
:::
