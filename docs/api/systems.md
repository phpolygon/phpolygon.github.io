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
| `OutlineSystem` | Emits `DrawOutline` for every enabled `Outline`; register before `Renderer3DSystem` |
| `LightConeSystem` | Draws the visible beam of every lit `LightCone` + `SpotLight` in view |
| `SurfaceTextSystem` | Keeps every `SurfaceText` on its current text and language |
| `FoliageInstanceSystem` | Draws `FoliageInstances` as static instanced batches |
| `GrassSystem` | Grass blades of every `GrassField` near the camera |
| `ParticleSystem` | Simulates and draws `ParticleEmitter` entities |
| `WaterDisturbanceSystem` | Wake trails and swimmer rings of every `WaterDisturber` |

The systems in the lower half of this table read the camera of the frame: register them after `Camera3DSystem` and before `Renderer3DSystem`.

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

### Navigation & Motion

| System | Purpose |
|---|---|
| `NavigationSystem` | Moves `NavMeshAgent` entities along NavMesh paths and authored waypoints |
| `SignalMotionSystem` | Drives `SignalTrack` / `SignalSpin` / `SignalSwitch` from `Signals` channels; register before `Transform3DSystem` |
| `PosePlayerSystem` | Plays `PosePlayer` clips onto bound figure parts; register before `Transform3DSystem` |

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
| `AudioListenerSystem` | Keeps the spatial-audio listener on the active 3D camera |

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

Every system has an `update(World $world, float $dt)` and a `render(World $world)` method; within each, systems run in the order they were added. `World::addSystem()` takes an optional `SystemPhase` that only matters when the engine runs threaded subsystems (`ext-parallel`):

| Phase | When | Typical use |
|---|---|---|
| `SystemPhase::MainThread` (default) | Before thread results arrive | Input, camera, player movement |
| `SystemPhase::Threaded` | Handled by the thread scheduler, skipped on the main thread | Work moved to a worker |
| `SystemPhase::PostThread` | After thread results are applied | Transform propagation |

```php
use PHPolygon\ECS\SystemPhase;

$world->addSystem(new Transform3DSystem(), SystemPhase::PostThread);
```

## Naming Convention

System classes use noun + `System` suffix: `Renderer3DSystem`, `Physics3DSystem`.
