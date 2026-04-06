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
use PHPolygon\Serialization\Attributes\Serializable;
use PHPolygon\Serialization\Attributes\Property;

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
use PHPolygon\ECS\System;
use PHPolygon\ECS\World;

class GravitySystem extends System
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

## Serialization

Components use PHP 8.x `#[Attribute]` annotations for automatic serialization via Reflection. Never implement manual `toJson()` / `fromJson()` methods.

```php
#[Serializable]
class Wind extends AbstractComponent
{
    #[Property]
    public Vec3 $direction = new Vec3(1, 0, 0);

    #[Property]
    public float $speed = 5.0;

    #[Property]
    public float $gustFrequency = 0.3;
}
```
