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
| GLFW | `GLFWAudioBackend` | Via php-glfw |
| PHP-GLFW | `PHPGLFWAudioBackend` | PHP GLFW bindings |
| Vio | `VioAudioBackend` | Vio hardware |
| Null | `NullAudioBackend` | Headless/testing |
