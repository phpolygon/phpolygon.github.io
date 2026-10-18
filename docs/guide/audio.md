# Audio

PHPolygon includes a multi-channel audio system with spatial audio support.

## Audio Channels

| Channel | Typical use |
|---|---|
| `AudioChannel::Master` | Overall volume control |
| `AudioChannel::Music` | Background music |
| `AudioChannel::SFX` | Sound effects |
| `AudioChannel::UI` | UI sounds |
| `AudioChannel::Voice` | Dialogue |

## Playing Audio

```php
use PHPolygon\Support\Facades\Audio;
use PHPolygon\Audio\AudioChannel;

// Play sounds on specific channels
Audio::playSfx('explosion');
Audio::playMusic('theme');
Audio::playUI('click');

// Adjust channel volume
Audio::setChannelVolume(AudioChannel::SFX, 0.8);
Audio::setChannelVolume(AudioChannel::Music, 0.5);
Audio::setMasterVolume(0.9);
```

## AudioSource Component

Attach an `AudioSource` to an entity for spatial or looping audio:

```php
use PHPolygon\Component\AudioSource;

$entity->attach(new AudioSource(
    clipId: 'campfire_loop',
    volume: 0.6,
    loop: true,
    playOnAwake: true,
));
```

| Property | Type | Default | Description |
|---|---|---|---|
| `clipId` | `string` | - | Audio clip ID |
| `volume` | `float` | `1.0` | Playback volume |
| `loop` | `bool` | `false` | Loop playback |
| `playOnAwake` | `bool` | `false` | Auto-play when entity spawns |

## AudioSystem

The `AudioSystem` manages playback lifecycle and stops audio sources when their entity is destroyed. Register it like any other system:

```php
$world->addSystem(new AudioSystem($engine->audio->getBackend()));
```

## Audio Backends

| Backend | Class | Notes |
|---|---|---|
| Vio | `VioAudioBackend` | Primary (via php-vio extension); WAV, FLAC, MP3, and Ogg Opus / Vorbis with a php-vio that has `vio_audio_formats()` |
| GLFW | `GLFWAudioBackend` | Fallback via php-glfw (WAV, FLAC, MP3) |
| Null | `NullAudioBackend` | Headless/testing |

`VioAudioBackend::load()` resolves every path through `AudioFormats::resolve()`: a game can ship
`line.opus` next to a `line.flac` fallback and keep asking for either name - the smallest file
this process can decode wins. Ogg files and `phar://` paths are decoded from memory, so
compressed audio also plays from inside the PHAR.

## Volume, Master and Ducking

`AudioManager` computes each voice as
`voice × channel × master × duck(channel) × duck(master)`; muting a channel or Master forces 0.
Every voice keeps its own volume, so a channel, master, mute or duck change recomputes it without
losing it.

Ducking is a separate gain stage - the player's channel volume (`getChannelVolume()`) is never
overwritten:

```php
$audio = $engine->audio;
$audio->setChannelDuck(AudioChannel::Music, -12.0, 0.3, 'speech'); // dB, fade seconds, reason
$audio->setChannelDuck(AudioChannel::Music, -20.0, 0.5, 'focus');  // strongest reason wins
$audio->releaseChannelDuck(AudioChannel::Music, 'speech', 0.6);    // ramps to the next one
$audio->clearChannelDucks();                                       // all channels
$audio->getChannelDuck(AudioChannel::Music);                       // current dB incl. ramp
```

- Several reasons per channel; the most negative one is effective. Positive values clamp to
  0 dB, -80 dB (`DUCK_FLOOR_DB`) or below silences. Ducking Master lowers every channel.
- Ramps are linear in dB and advance in `AudioManager::update($dt)`, which the engine calls every
  update tick. Tools and tests that drive an `AudioManager` outside the engine loop call it
  themselves; fade 0 applies immediately.

## Stem Player

`StemPlayer` plays pre-rendered music stems that come and go as the game reaches marks (a
cutscene's beats, a fight's phases). The arrangement is a `StemSchedule` - pure arithmetic shared
by the live player and an offline mix (`gainAt()`), so the game and a rendered video use the same
arrangement:

```php
use PHPolygon\Audio\StemPlayer;
use PHPolygon\Audio\Dsp\GainFollower;

$player = new StemPlayer($engine->audio, AudioChannel::Music, new GainFollower(0.3, 0.6, -8.0), $onProblem);
$player->addStem('calm', 'assets/music/calm.ogg');   // null / failed load = silent stem, reported once
$player->addStem('tense', 'assets/music/tense.ogg');
$player->preload();

$s = $player->schedule();
$s->start('calm', $t, fadeIn: 1.0, gain: 0.3);
$s->crossfade('calm', 'tense', $t + 20.0, 1.0, gain: 0.3, fadeIn: 1.5);
$s->fadeOut('tense', $t + 40.0, 2.0);

$player->update($now);              // every frame, monotonic seconds
$handoffs = $player->release(2.0);  // hand the still-playing stems to a new owner
```

Volumes go through `setPlaybackVolume()`, so channel and Master volume, mute and
`setChannelDuck()` stack on top. `duck($db)` / `duck($db, 'stem')` ducks all stems or one stem on
the player's own clock.

## Offline DSP and Codecs

`PHPolygon\Audio\Dsp` and `PHPolygon\Audio\Codec` are plain-PHP tools for audio a game renders
**ahead of time** (build hooks, prebake scripts) - nothing here runs per frame. Every class works on
`list<float>` mono (or two lists for stereo) at a sample rate that defaults to 44.1 kHz and is a
parameter everywhere. All of it is deterministic: same input, same bytes.

| Class | Purpose |
|---|---|
| `Dsp\Pcm` | Shared conventions: `SAMPLE_RATE`, `toInt16()`, `db()`, `hz()` |
| `Dsp\Fft` | In-place radix-2 FFT |
| `Dsp\Resampler` | Band-limited sinc `convert()` (rate change) and `stretch()` (length and pitch) |
| `Dsp\Loudness` | ITU-R BS.1770 integrated loudness (LUFS) |
| `Dsp\Limiter` | Offline look-ahead peak limiter, optional true-peak estimate |
| `Dsp\GainFollower` | Gain that follows a dB target with separate down/up speeds (also usable per frame) |
| `Codec\WavReader` / `WavWriter` | RIFF/WAVE in and out (16/24-bit PCM, 32-bit float, any channel count) |
| `Codec\FlacReader` / `FlacWriter` | Complete FLAC decoder and lossless encoder in plain PHP |
| `Codec\AudioReader` | Any source → mono floats: WAV/FLAC in PHP, Opus/Vorbis/MP3 through php-vio |
| `Codec\OpusWriter` + `OpusSettings` | Ogg Opus through php-vio's libopus (`vio_audio_encode`) |
| `Codec\VorbisWriter` + `VorbisSettings` | Ogg Vorbis through php-vio's libvorbis (quality or ABR) |
| `Codec\AudioFormats` | What this process decodes/encodes (`detect()`), `choose()`, `resolve()` |
| `Codec\AudioEncoder` | Preference list + settings → writes the first format that works, else FLAC |

### Compressed audio (Opus / Vorbis)

php-vio decodes and encodes Ogg Opus and Ogg Vorbis from the release that has
`vio_audio_formats()` (2.34); `AudioFormats::detect()` is the feature test. Older php-vio and the
php-glfw backend handle WAV, FLAC and MP3 only.

```php
use PHPolygon\Audio\Codec\AudioEncoder;
use PHPolygon\Audio\Codec\AudioFormats;
use PHPolygon\Audio\Codec\OpusSettings;

$encoder = new AudioEncoder(
    [AudioFormats::OPUS, AudioFormats::FLAC],
    new OpusSettings(bitrate: 32000, encodeRate: 24000, application: 'voip'),
);
$bytes = $encoder->encode([$samples], 24000);   // one (mono) or two lists of signed 16-bit samples
file_put_contents("line.{$encoder->extension()}", $bytes);
```

When the process cannot encode the preferred codec - or the `player` formats passed to the
encoder cannot decode it - it writes FLAC (`isFallback()`). A hook that runs on the shipped
runtime needs no `player`. Starting points (a game's choice, not engine presets): speech Opus
24 kHz mono 24-48 kbit/s `voip`; music Vorbis q0.5 or Opus 48 kHz 96-128 kbit/s. Both loop
gaplessly. Render at the encode rate - resampling long material in PHP is slow.

### Voice processing

`Dsp\Voice` reshapes recorded or synthesized voices offline:

| Class | Purpose |
|---|---|
| `PitchDetector` / `PitchTrack` | YIN f0 tracker, voiced/unvoiced per frame |
| `VoiceShaper` | Pitch and formant shift, tempo, tilt shelves, breath noise |
| `VoiceReference` / `VoiceMatcher` | A voice's measurable fingerprint and a matcher that steers a recording toward it |
| `Crusher` | Sample-and-hold, bit reduction, dropouts |
| `Vocoder` + `VocoderCarrier` | Channel vocoder with a pluggable carrier (`SawChordCarrier` default) |
| `VoiceProfile` | Value object: pitch, formant, tempo, tilt, breath, vocoder, crush; `withOverrides()`, `fingerprint()` |
| `VoiceChain` | match → shape → crush → vocode → -16 LUFS (peak ≤ -1 dBFS) |

Presets belong to the game: the engine ships the parameter object, not named voices. A game that
prebakes audio hashes `VoiceChain::CHAIN_VERSION` and `VoiceProfile::fingerprint()` (plus its own
carrier and inputs) into its cache keys; `CHAIN_VERSION` is bumped whenever the output for the same
input changes.

For generating spoken lines from translation files, see [Speech Synthesis](/guide/speech).
