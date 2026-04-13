# Systems

Systems own cross-entity logic. They iterate components across multiple entities.

## Built-in Systems

### Rendering

| System | Purpose |
|---|---|
| `Renderer3DSystem` | Collects `MeshRenderer` + `Transform3D`, builds `RenderCommandList` |
| `Renderer2DSystem` | Renders `SpriteRenderer` entities via the 2D renderer |
| `Camera3DSystem` | Updates 3D view/projection matrices, pushes `SetCamera` command |
| `Camera2DSystem` | Updates the active 2D camera |
| `InstancedTerrainSystem` | Renders instanced terrain via `DrawMeshInstanced` commands |
| `UISystem` | Manages UI layers and widget rendering |

### Physics

| System | Purpose |
|---|---|
| `Physics3DSystem` | 3D collision detection, character controller, capsule vs AABB |
| `Physics2DSystem` | 2D collision detection |
| `RigidBody3DSystem` | Integrates rigid body velocities and applies forces |
| `DoorSystem` | Updates hinge and linear joints with damping and angle/distance limits |

### Environment

| System | Purpose |
|---|---|
| `DayNightSystem` | Drives day/night cycle, updates sun direction, sky colors, ambient light, fog |
| `WindSystem` | Advances wind time, modulates intensity with layered gusts |
| `WeatherSystem` | Manages weather state transitions (Clear/Cloudy/Rain/Snow/Storm/Fog) |
| `PrecipitationSystem` | Renders rain and snow particles |
| `SeasonSystem` | Updates seasonal parameters |
| `EnvironmentalSystem` | Base environmental simulation |
| `AtmosphericEnvironmentalSystem` | Extends EnvironmentalSystem for atmospheric physics |

### Transform & Hierarchy

| System | Purpose |
|---|---|
| `Transform3DSystem` | Updates `Transform3D` world matrices from parent/child hierarchy |
| `HierarchySystem` | Updates `Transform2D` world matrices based on 2D hierarchy |

### Input & Audio

| System | Purpose |
|---|---|
| `InputMapSystem` | Processes input bindings and dispatches input actions |
| `AudioSystem` | Manages audio playback, stops sources on entity destroy |

## Custom Systems

```php
use PHPolygon\ECS\AbstractSystem;
use PHPolygon\ECS\World;

class DamageSystem extends AbstractSystem
{
    public function update(World $world, float $dt): void
    {
        foreach ($world->query(Health::class, DamageReceiver::class) as $entity) {
            $health = $entity->get(Health::class);
            $receiver = $entity->get(DamageReceiver::class);

            foreach ($receiver->pendingDamage as $damage) {
                $health->damage($damage);
            }
            $receiver->pendingDamage = [];

            if ($health->isDead()) {
                $world->destroyEntity($entity->id);
            }
        }
    }
}
```

## System Phases

Systems execute in defined phases via the `SystemPhase` enum:

| Phase | When | Typical use |
|---|---|---|
| `PreUpdate` | Before main update | Input processing, physics preparation |
| `Update` | Main game logic | Gameplay systems, AI, animation |
| `Render` | After update | Camera, renderer, UI systems |
| `PostUpdate` | After render | Cleanup, event dispatch |

## Naming Convention

System classes use noun + `System` suffix: `Renderer3DSystem`, `Physics3DSystem`.
