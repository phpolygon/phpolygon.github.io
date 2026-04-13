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
Scenes::loadScene(MainScene::class);

// Scene lifecycle events
Events::listen(SceneLoaded::class, function (SceneLoaded $e) {
    // Scene is ready
});
```

## Load Modes

Scenes can be loaded in two modes:

| Mode | Behavior |
|---|---|
| `LoadMode::Single` | Unloads the current scene, then loads the new one (default) |
| `LoadMode::Additive` | Loads the new scene on top of the current one |

```php
Scenes::loadScene(OverlayScene::class, LoadMode::Additive);
```

## Scene Lifecycle Events

| Event | When |
|---|---|
| `SceneLoading` | Before scene load begins |
| `SceneLoaded` | After scene is built and ready |
| `SceneUnloading` | Before scene unload begins |
| `SceneUnloaded` | After scene is fully unloaded |
| `SceneActivated` | Scene becomes the active scene |
| `SceneDeactivated` | Scene is no longer active |

## Scene Management

The `SceneManager` handles scene lifecycle:

```php
$engine->scenes->loadScene(MainScene::class);    // Load and build
$engine->scenes->current();                  // Get active scene
```

## Prefabs

Reusable entity templates are registered via `PrefabRegistry` and implement `PrefabInterface`:

```php
use PHPolygon\Scene\AbstractPrefab;
use PHPolygon\Scene\SceneBuilder;

class TreePrefab extends AbstractPrefab
{
    public static function getName(): string
    {
        return 'tree';
    }

    public function build(SceneBuilder $builder): EntityDeclaration
    {
        return $builder->entity('Tree')
            ->with(new Transform3D())
            ->with(new MeshRenderer('palm_trunk', 'wood'))
            ->with(new PalmSway(swayStrength: 0.3));
    }
}

// Register
PrefabRegistry::register(TreePrefab::class);
```

PHPolygon includes built-in prefab builders for doors (`DoorBuilder`), furniture (`CrateBuilder`, `TableBuilder`, `ShelfBuilder`, etc.), and roofs (`RoofBuilder` with flat/gable/hip/mansard/shed/thatched variants).

## Scene Transpiler

The `SceneTranspiler` converts JSON scene files (`.scene.json`) to PHP code and vice versa. This is used by the [PHPolygon Editor](/guide/editor) to maintain the PHP-canonical model while providing a visual editing workflow.
