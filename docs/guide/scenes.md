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
    public function getName(): string
    {
        return 'main';
    }

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

// Register the class under a name once, then load by that name
Scenes::register('main', MainScene::class);
Scenes::loadScene('main');

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
use PHPolygon\Scene\LoadMode;

Scenes::register('overlay', OverlayScene::class);
Scenes::loadScene('overlay', LoadMode::Additive);
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
$engine->scenes->register('main', MainScene::class);
$engine->scenes->loadScene('main');          // Load and build
$engine->scenes->getActiveScene();           // ?Scene
$engine->scenes->getActiveSceneName();       // 'main'
$engine->scenes->isLoaded('main');           // bool
$engine->scenes->unloadScene('main');
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

// Use it in a scene by class...
$builder->prefab(TreePrefab::class, 'Tree_1');

// ...or by its registered name through a PrefabRegistry
$registry = new PrefabRegistry();
$registry->register(TreePrefab::class);
$builder->setPrefabRegistry($registry);
$builder->prefabByName('tree', 'Tree_2');
```

For prefabs with a fluent modifier chain (`->suv()->paintedWith(...)->place(...)`), extend `PHPolygon\Scene\Prefab` instead - see [Prefabs](/guide/prefabs).

PHPolygon includes built-in prefab builders for doors (`DoorBuilder`), furniture (`CrateBuilder`, `TableBuilder`, `ShelfBuilder`, etc.), and roofs (`RoofBuilder` with flat/gable/hip/mansard/shed/thatched variants).

## Layout Sockets

When a room, hall or yard is built from independent parts (walls, ceiling, doors, lights, furniture), each part can publish where the others may attach or must keep clear - as plain data from `PHPolygon\Scene\Layout` instead of guessed coordinates:

| Class | Describes |
|---|---|
| `Opening(name, center, normal, width, height, kind)` | A door, window or pass-through. `center` is the middle of the bottom edge, `normal` the direction you pass through. `top()`, `middle()`, `clearance($depth)` (the `Zone` to keep free) |
| `MountPoint(name, position, normal, kind)` | One attachment point on a surface, `normal` pointing away from it |
| `MountLine(name, start, end, normal, kind)` | A run along a surface (rail, tray, screen strip). `pointAt($t)`, `midpoint()`, `length()` |
| `Zone(name, min, max, kind)` / `Zone::around(name, center, halfExtents, kind)` | An axis-aligned box (walk zone, keep-out, footprint). `contains()`, `overlaps()`, `expanded($m)` |

```php
use PHPolygon\Math\Vec3;
use PHPolygon\Scene\Layout\Opening;
use PHPolygon\Scene\Layout\Zone;

// Published by the wall builder
$door = new Opening('door_north', new Vec3(0, 0, -5), new Vec3(0, 0, -1), width: 1.2, height: 2.1, kind: 'door');

// Used by the furniture builder: nothing may stand in front of the door
$keepFree = $door->clearance(1.5);
$table = Zone::around('table', new Vec3(0, 0.4, -4.2), new Vec3(0.8, 0.4, 0.5));
if ($keepFree->overlaps($table)) {
    // move the table
}
```

All four are immutable, carry a free `kind` tag the game chooses, and live in the publisher's space (usually room-local); `transformed(Mat4)` moves any of them into another space.

### Placing a group at an angle

`SceneFrame` lets you build a room as if its origin were (0, 0, 0) and its axes the world's, then place it rotated:

```php
use PHPolygon\Scene\SceneFrame;

$mark = SceneFrame::mark($builder);                  // remember where the group starts
buildRoom($builder);                                 // declare entities in local coordinates
$frame = new SceneFrame(new Vec3(40, 0, 12), deg2rad(30.0));
$frame->place($builder, $mark);                      // move and turn every top-level entity declared since the mark
```

Each entity gets the turn in its own rotation (children follow their parent), so box colliders keep colliding as oriented boxes. Sockets that came out in local space go through `$frame->point()`, `direction()` and `yaw()`.

## Scene Transpiler

The `SceneTranspiler` converts JSON scene files (`.scene.json`) to PHP code and vice versa. This is used by the [PHPolygon Editor](/guide/editor) to maintain the PHP-canonical model while providing a visual editing workflow.
