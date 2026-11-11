# Physics

PHPolygon provides 2D and 3D physics with collision detection, rigid bodies, and joint mechanics.

## 3D Collision

### Character Controller

The `CharacterController3D` provides capsule-based collision for player characters:

```php
use PHPolygon\Component\CharacterController3D;

$player->attach(new CharacterController3D(
    height: 1.8,
    radius: 0.4,
    stepHeight: 0.3,
    slopeLimit: 45.0,
));
```

The controller tracks grounded state, supports walking/falling/seated/mounted/animated states, and can be coupled to other entities (vehicles, mounts). `stepHeight` works on every collider type. `groundEntityId` names the entity the character stands on (null in the air and on the bare ground plane); `PHPolygon\Physics\GroundProbe::under($world, $controller)` turns it into a `GroundHit` with the mesh and material underfoot - the basis for footstep sounds per surface.

### Colliders

| Collider | Description |
|---|---|
| `BoxCollider3D` | AABB box with `size`, `offset`, `isTrigger`, `isStatic` |
| `MeshCollider3D` | Triangle mesh with BVH acceleration. Set `meshId` and `isStatic` |
| `HeightmapCollider3D` | O(1) terrain collision from height data grid |

```php
use PHPolygon\Component\BoxCollider3D;
use PHPolygon\Math\Vec3;

$crate->attach(new BoxCollider3D(
    size: new Vec3(1.0, 1.0, 1.0),
    isTrigger: false,
    isStatic: false,
));
```

### Rigid Bodies

`RigidBody3D` supports three body types via the `BodyType` enum:

| Type | Behavior |
|---|---|
| `BodyType::Static` | Immovable, only collides with dynamic bodies |
| `BodyType::Kinematic` | Moved by code, not affected by forces |
| `BodyType::Dynamic` | Fully simulated with gravity, forces, and collisions |

```php
use PHPolygon\Component\RigidBody3D;
use PHPolygon\Component\BodyType;

$barrel->attach(new RigidBody3D(
    bodyType: BodyType::Dynamic,
    mass: 50.0,
    restitution: 0.3,
    friction: 0.6,
));
```

### Joints

| Joint | Description |
|---|---|
| `HingeJoint` | Revolute joint for doors and gates. Parameters: `anchorOffset`, `axis`, `minAngle`, `maxAngle`, `damping` |
| `LinearJoint` | Prismatic joint for sliding doors. Parameters: `slideAxis`, `minPosition`, `maxPosition`, `damping` |

The `DoorSystem` automatically updates entities with these joints.

### Raycasts and Line of Sight

`PHPolygon\Physics\Raycaster3D` answers two kinds of question:

```php
use PHPolygon\Math\Ray;
use PHPolygon\Math\Vec3;
use PHPolygon\Physics\Raycaster3D;

$raycaster = new Raycaster3D();

// Nearest hit against box colliders: entityId, point, normal, distance (or null)
$hit = $raycaster->raycast($world, new Ray($origin, new Vec3(0, 0, -1)), maxDistance: 50.0);

// Occlusion only: is anything solid between these two points?
$blocked = $raycaster->segmentBlocked($world, $eye, $target);
```

`raycast()` / `raycastAll()` test box colliders and work without a `Physics3DSystem`. `segmentBlocked()` is meant for per-frame use (line of sight, camera checks): it tests mesh colliders and boxes against the data `Physics3DSystem` already caches, ignores triggers and heightmaps, and does not see a collider the physics system has not processed yet.

## 2D Physics

| Component | Description |
|---|---|
| `RigidBody2D` | 2D body with velocity, mass, drag, gravity scale, restitution |
| `BoxCollider2D` | 2D box collider with offset, size, trigger flag |

## Collision Events

The physics systems emit events through the `EventDispatcher`:

```php
use PHPolygon\Support\Facades\Events;
use PHPolygon\Event\CollisionEnter;
use PHPolygon\Event\TriggerEnter;

Events::listen(CollisionEnter::class, function (CollisionEnter $e) {
    // $e->entityA, $e->entityB, $e->normal, $e->penetration, $e->contactPoint
});

Events::listen(TriggerEnter::class, function (TriggerEnter $e) {
    // Entity entered a trigger zone
});
```

| Event | When |
|---|---|
| `CollisionEnter` | Two bodies start colliding |
| `CollisionExit` | Two bodies stop colliding |
| `TriggerEnter` | Entity enters a trigger collider |
| `TriggerExit` | Entity leaves a trigger collider |

## Acceleration Structures

- **BVH** (Bounding Volume Hierarchy) - used by `MeshCollider3D` for triangle queries with median-split construction
- **SpatialHash3D** - grid-based spatial acceleration for broad-phase collision detection

## Systems

| System | Purpose |
|---|---|
| `Physics3DSystem` | 3D collision detection, character controller |
| `Physics2DSystem` | 2D collision detection |
| `RigidBody3DSystem` | Force integration, velocity updates |
| `DoorSystem` | Joint simulation (hinge + linear) |
