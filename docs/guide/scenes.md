# Scenes

## PHP-Canonical Model

PHP is always the canonical source of truth for scene structure. JSON is the intermediate format for the [PHPolygon Editor](/guide/editor) (`phpolygon/editor`).

| Format | Purpose |
|---|---|
| PHP scene files | Canonical source, version-controlled |
| JSON `.scene.json` | Editor interchange, derived from PHP |
| JSON runtime state | Save games, dynamic positions |

## Defining a Scene

```php
use PHPolygon\Scene\Scene;
use PHPolygon\Scene\SceneBuilder;
use PHPolygon\Component\Transform3D;
use PHPolygon\Component\MeshRenderer;
use PHPolygon\Component\DirectionalLight;
use PHPolygon\Math\Vec3;

class MainScene extends Scene
{
    public function build(SceneBuilder $b): void
    {
        // Sun light
        $b->entity('Sun')
            ->with(new Transform3D())
            ->with(new DirectionalLight(
                direction: new Vec3(-0.5, -1.0, -0.3),
                intensity: 1.2,
            ));

        // Ground
        $b->entity('Ground')
            ->with(new Transform3D(scale: new Vec3(100, 1, 100)))
            ->with(new MeshRenderer('plane_1x1', 'grass'));

        // Player
        $b->entity('Player')
            ->with(new Transform3D(position: new Vec3(0, 2, 0)))
            ->with(new CharacterController3D(height: 1.8, radius: 0.4));
    }
}
```

## Loading Scenes

```php
use PHPolygon\Support\Facades\Scenes;

// Load by class
Scenes::load(MainScene::class);

// Scene lifecycle events
Events::listen(SceneLoaded::class, function (SceneLoaded $e) {
    // Scene is ready
});
```

## Scene Management

The `SceneManager` handles scene lifecycle:

```php
$engine->scenes->load(MainScene::class);    // Load and build
$engine->scenes->current();                  // Get active scene
```
