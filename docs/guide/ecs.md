# ECS Architecture

PHPolygon uses a **hybrid ECS model** that combines the flexibility of object-oriented entities with the performance patterns of data-oriented design.

## Entities

Entities are PHP objects with a component array. They have identity and lifecycle.

```php
$player = $world->createEntity();
$player->attach(new Transform3D(position: new Vec3(0, 2, 0)));
$player->attach(new MeshRenderer('character', 'skin'));
```

## Components

Components own **per-entity** behavior. They may hold data and per-entity logic via lifecycle hooks:

- `onAttach()`  - called when added to an entity
- `onUpdate(float $dt)`  - called every tick
- `onDetach()`  - called when removed
- `onInspectorGUI()`  - editor UI rendering

```php
use PHPolygon\ECS\AbstractComponent;
use PHPolygon\ECS\Attribute\Serializable;
use PHPolygon\ECS\Attribute\Property;

#[Serializable]
class Health extends AbstractComponent
{
    #[Property]
    public float $current = 100.0;

    #[Property]
    public float $max = 100.0;

    public function damage(float $amount): void
    {
        $this->current = max(0, $this->current - $amount);
    }

    public function isDead(): bool
    {
        return $this->current <= 0;
    }
}
```

## Systems

Systems own **cross-entity** logic. A System iterates components across multiple entities:

```php
use PHPolygon\ECS\AbstractSystem;
use PHPolygon\ECS\World;

class GravitySystem extends AbstractSystem
{
    public function update(World $world, float $dt): void
    {
        foreach ($world->query(Transform3D::class, RigidBody::class) as $entity) {
            $transform = $entity->get(Transform3D::class);
            $rb = $entity->get(RigidBody::class);

            $rb->velocity->y -= 9.81 * $dt;
            $transform->position = $transform->position->add(
                $rb->velocity->scale($dt)
            );
        }
    }
}
```

## Discipline Rule

> Never put cross-entity logic in a Component. Never put per-entity render or state logic in a System.

| Logic type | Goes in |
|---|---|
| Per-entity state and behavior | Component |
| Cross-entity iteration and coordination | System |
| Per-entity rendering | Component (`onRender`) |
| Scene-wide rendering pipeline | System (`Renderer3DSystem`) |

## System Phases

Systems execute in defined phases via the `SystemPhase` enum:

| Phase | When |
|---|---|
| `PreUpdate` | Before main update (input, physics prep) |
| `Update` | Main game logic (gameplay, AI, animation) |
| `Render` | After update (camera, renderer, UI) |
| `PostUpdate` | After render (cleanup, events) |

## Serialization

Components use PHP 8.x `#[Attribute]` annotations for automatic serialization via Reflection. All attributes live in `PHPolygon\ECS\Attribute`. Never implement manual `toJson()` / `fromJson()` methods.

```php
use PHPolygon\ECS\Attribute\Serializable;
use PHPolygon\ECS\Attribute\Property;
use PHPolygon\ECS\Attribute\Range;
use PHPolygon\ECS\Attribute\Hidden;

#[Serializable]
class Wind extends AbstractComponent
{
    #[Property]
    public float $baseIntensity = 1.0;

    #[Property]
    #[Range(min: 0.0, max: 2.0)]
    public float $gustiness = 0.5;

    #[Property]
    public float $gustFrequency = 0.3;

    #[Hidden]
    public float $time = 0.0;
}
```

### Available Attributes

| Attribute | Target | Purpose |
|---|---|---|
| `#[Serializable]` | Class | Marks component for serialization and editor discovery |
| `#[Property]` | Property | Exposes property to editor (supports `editorHint`) |
| `#[Hidden]` | Property | Hides property from editor |
| `#[Category]` | Class | Groups properties in inspector |
| `#[Range]` | Property | Numeric range constraints for sliders |

## Events

The ECS fires lifecycle events via the `EventDispatcher`:

| Event | When |
|---|---|
| `EntitySpawned` | Entity created |
| `EntityDestroyed` | Entity destroyed |
| `CollisionEnter` / `CollisionExit` | Collision start/end |
| `TriggerEnter` / `TriggerExit` | Trigger zone enter/exit |
| `SceneLoading` / `SceneLoaded` | Before/after scene load |
| `SceneUnloading` / `SceneUnloaded` | Before/after scene unload |
| `SceneActivated` / `SceneDeactivated` | Scene becomes active/inactive |
