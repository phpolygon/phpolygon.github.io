# Components

All components extend `AbstractComponent` and use `#[Serializable]` for automatic serialization. Attributes live in `PHPolygon\ECS\Attribute`.

## 3D Components

| Component | Key Properties | Purpose |
|---|---|---|
| `Transform3D` | `position: Vec3`, `rotation: Quaternion`, `scale: Vec3`, `parentEntityId: ?int` | World/local transform with hierarchy |
| `Camera3DComponent` | `fov: float`, `near: float`, `far: float`, `projectionType: ProjectionType`, `active: bool` | Projection settings |
| `MeshRenderer` | `meshId: string`, `materialId: string`, `castShadows: bool` | Renderable mesh |
| `DirectionalLight` | `direction: Vec3`, `color: Color`, `intensity: float` | Sun/moon light |
| `PointLight` | `color: Color`, `intensity: float`, `radius: float` | Positional light |

## 2D Components

| Component | Key Properties | Purpose |
|---|---|---|
| `Transform2D` | `position: Vec2`, `rotation: float`, `scale: Vec2`, `parentEntityId: ?int` | 2D transform with hierarchy |
| `Camera2DComponent` | `zoom: float`, `bounds: ?Rect`, `active: bool` | 2D orthographic camera |
| `SpriteRenderer` | `textureId: string`, `region: ?Rect`, `color: Color`, `layer: int`, `flipX/Y: bool`, `opacity: float` | 2D sprite rendering |

## Physics 3D Components

| Component | Key Properties | Purpose |
|---|---|---|
| `CharacterController3D` | `height`, `radius`, `stepHeight`, `slopeLimit` | Capsule collision controller |
| `RigidBody3D` | `bodyType: BodyType`, `mass`, `gravityScale`, `linearDamping`, `restitution`, `friction` | Physics body (Static/Kinematic/Dynamic) |
| `BoxCollider3D` | `size: Vec3`, `offset: Vec3`, `isTrigger: bool`, `isStatic: bool` | AABB box collider |
| `MeshCollider3D` | `meshId: string`, `isStatic: bool`, `isTrigger: bool` | Triangle mesh collider with BVH |
| `HeightmapCollider3D` | `gridWidth`, `gridDepth`, `worldMinX/MaxX/MinZ/MaxZ` | O(1) terrain collision |
| `HingeJoint` | `anchorOffset: Vec3`, `axis: Vec3`, `angle`, `minAngle`, `maxAngle`, `damping` | Revolute joint for doors/gates |
| `LinearJoint` | `slideAxis: Vec3`, `position`, `minPosition`, `maxPosition`, `damping` | Prismatic joint for sliding doors |

## Physics 2D Components

| Component | Key Properties | Purpose |
|---|---|---|
| `RigidBody2D` | `velocity: Vec2`, `mass`, `drag`, `angularVelocity`, `gravityScale`, `restitution`, `isKinematic` | 2D physics body |
| `BoxCollider2D` | `offset: Vec2`, `size: Vec2`, `isTrigger: bool` | 2D box collider |

## Environmental Components

| Component | Key Properties | Purpose |
|---|---|---|
| `Atmosphere` | `cloudBaseAltitude`, `airPressure` | Atmospheric simulation (pressure, visibility, thermals) |
| `Wind` | `baseIntensity`, `gustiness`, `gustFrequency` | Wind simulation with layered gusts |
| `DayNightCycle` | `timeOfDay: float`, `dayDuration`, `speed`, `paused: bool`, `lunarCycleDays` | Day/night cycle (0.0-1.0 time) |
| `Weather` | `cloudCoverage`, `humidity`, `transitionDuration` | Weather state machine (Clear/Cloudy/Rain/Snow/Storm/Fog) |
| `Season` | `yearProgress`, `yearDuration`, `speed` | Seasonal cycle (spring/summer/fall/winter) |

## Animation Components

| Component | Key Properties | Purpose |
|---|---|---|
| `PalmSway` | `swayStrength`, `phaseOffset`, `isTrunk: bool` | Wind-driven sway for vegetation |

## Terrain Components

| Component | Key Properties | Purpose |
|---|---|---|
| `InstancedTerrain` | `meshId: string`, `matricesByMaterial: array<string, list<Mat4>>` | Pre-computed instanced terrain |

## Audio Components

| Component | Key Properties | Purpose |
|---|---|---|
| `AudioSource` | `clipId: string`, `volume: float`, `loop: bool`, `playOnAwake: bool` | Audio playback |

## Utility Components

| Component | Key Properties | Purpose |
|---|---|---|
| `NameTag` | `name: string` | Entity name for debugging/referencing |

## Custom Components

```php
use PHPolygon\ECS\AbstractComponent;
use PHPolygon\ECS\Attribute\Serializable;
use PHPolygon\ECS\Attribute\Property;
use PHPolygon\ECS\Attribute\Category;
use PHPolygon\ECS\Attribute\Range;
use PHPolygon\ECS\Attribute\Hidden;

#[Serializable]
#[Category('Gameplay')]
class Inventory extends AbstractComponent
{
    #[Property]
    public int $maxSlots = 20;

    #[Property(editorHint: 'slider')]
    #[Range(min: 0, max: 100)]
    public int $weight = 0;

    #[Hidden]
    public array $items = [];

    public function addItem(string $itemId): bool
    {
        if (count($this->items) >= $this->maxSlots) {
            return false;
        }
        $this->items[] = $itemId;
        return true;
    }
}
```

## Component Attributes

| Attribute | Target | Parameters | Purpose |
|---|---|---|---|
| `#[Serializable]` | Class | `?string $name` | Marks component for serialization & editor discovery |
| `#[Property]` | Property | `?string $name`, `?string $type`, `?string $editorHint`, `?string $description` | Exposes property to editor |
| `#[Hidden]` | Property | - | Hides property from editor |
| `#[Category]` | Class | `string $name` | Groups properties in inspector (Core, Rendering, Physics, etc.) |
| `#[Range]` | Property | `float $min`, `float $max` | Numeric range constraints for sliders |

## Naming Convention

Component classes use noun names without suffix: `MeshRenderer`, `BoxCollider2D`, `Transform3D`.
