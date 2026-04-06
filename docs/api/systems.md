# Systems

Systems own cross-entity logic. They iterate components across multiple entities.

## Built-in Systems

| System | Purpose |
|---|---|
| `Renderer3DSystem` | Collects `MeshRenderer` + `Transform3D`, builds `RenderCommandList` |
| `Camera3DSystem` | Updates view/projection matrices, pushes `SetCamera` command |
| `Physics3DSystem` | Capsule vs AABB collision, gravity integration |
| `AtmosphericEnvironmentalSystem` | Weather simulation, temperature, wind |

## Custom Systems

```php
use PHPolygon\ECS\System;
use PHPolygon\ECS\World;

class DamageSystem extends System
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
                $world->despawn($entity);
            }
        }
    }
}
```

## Naming Convention

System classes use noun + `System` suffix: `Renderer3DSystem`, `Physics3DSystem`.
