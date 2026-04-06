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

## Usage

```php
use PHPolygon\Support\Facades\World;
use PHPolygon\Support\Facades\Events;
use PHPolygon\Support\Facades\Shader;

// Spawn an entity
$player = World::spawn('Player');

// Listen for events
Events::listen(EntitySpawned::class, function ($e) { /* ... */ });

// Switch shaders
Shader::use('unlit');
Shader::available();  // ['default', 'unlit', 'normals', 'depth', 'skybox']
Shader::reset();
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
