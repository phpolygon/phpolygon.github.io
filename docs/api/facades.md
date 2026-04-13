# Facades

PHPolygon provides Laravel-style facades for convenient static access to engine services. All facades are in the `PHPolygon\Support\Facades` namespace.

## Available Facades

| Facade | Service | Engine property |
|---|---|---|
| `World` | ECS World | `$engine->world` |
| `Window` | Runtime Window | `$engine->window` |
| `Input` | Keyboard & Mouse | `$engine->input` |
| `Camera2D` | 2D View Transform | `$engine->camera2D` |
| `Textures` | Texture Manager | `$engine->textures` |
| `Events` | Event Dispatcher | `$engine->events` |
| `GameLoop` | Fixed Timestep | `$engine->gameLoop` |
| `Clock` | Timing Metrics | `$engine->clock` |
| `Scenes` | Scene Manager | `$engine->scenes` |
| `Shader` | Shader Manager | `$engine->shaders` |
| `Audio` | Audio Manager | `$engine->audio` |
| `CommandList3D` | 3D Render Commands | `$engine->commandList3D` |
| `Locale` | Localization | `$engine->locale` |
| `Renderer2D` | 2D Renderer | `$engine->renderer2D` |
| `Renderer3D` | 3D Renderer | `$engine->renderer3D` |
| `Saves` | Save Manager | `$engine->saves` |
| `Scheduler` | Thread Scheduler | `$engine->scheduler` |

## Usage

```php
use PHPolygon\Support\Facades\World;
use PHPolygon\Support\Facades\Events;
use PHPolygon\Support\Facades\Shader;
use PHPolygon\Support\Facades\Audio;
use PHPolygon\Support\Facades\Saves;
use PHPolygon\Support\Facades\Scenes;

// Create an entity
$player = World::createEntity();

// Listen for events
Events::listen(EntitySpawned::class, function ($e) { /* ... */ });

// Switch shaders
Shader::use('unlit');
Shader::available();  // ['default', 'unlit', 'normals', 'depth', 'shadow', 'skybox']
Shader::reset();

// Audio playback
Audio::playSfx('explosion');
Audio::playMusic('theme');
Audio::setChannelVolume(AudioChannel::SFX, 0.8);

// Save/load
Saves::save(slotIndex: 0, name: 'Quicksave', data: ['level' => 3]);
Saves::load(slotIndex: 0);

// Scene management
Scenes::loadScene(MyScene::class);
```

## How Facades Work

Each facade is a thin static proxy that resolves to a service on the `Engine` instance:

```php
abstract class Facade
{
    abstract protected static function getFacadeAccessor(): string;
}

// Example: Shader facade resolves to $engine->shaders
class Shader extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'shaders';
    }
}
```

The engine is set automatically during construction via `Facade::setEngine($engine)`.
