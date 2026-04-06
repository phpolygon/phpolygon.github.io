# Components

All components extend `AbstractComponent` and use `#[Serializable]` for automatic serialization.

## 3D Components

| Component | Properties | Purpose |
|---|---|---|
| `Transform3D` | `position: Vec3`, `rotation: Quaternion`, `scale: Vec3` | World/local transform |
| `Camera3DComponent` | `fov: float`, `near: float`, `far: float` | Projection settings |
| `MeshRenderer` | `meshId: string`, `materialId: string`, `castShadows: bool` | Renderable mesh |
| `DirectionalLight` | `direction: Vec3`, `color: Color`, `intensity: float` | Sun/moon light |
| `PointLight` | `color: Color`, `intensity: float`, `radius: float` | Positional light |
| `CharacterController3D` | `height`, `radius`, `gravity`, `slopeLimit` | Capsule collision |
| `HeightmapCollider3D` | `heightData`, `gridSize`, `cellSize` | O(1) terrain collision |

## Environmental Components

| Component | Properties | Purpose |
|---|---|---|
| `Atmosphere` | `temperature`, `humidity`, `windSpeed` | Weather state |
| `Wind` | `direction: Vec3`, `speed`, `gustFrequency` | Wind simulation |

## Custom Components

```php
use PHPolygon\ECS\AbstractComponent;
use PHPolygon\Serialization\Attributes\Serializable;
use PHPolygon\Serialization\Attributes\Property;
use PHPolygon\Serialization\Attributes\Category;

#[Serializable]
#[Category('Gameplay')]
class Inventory extends AbstractComponent
{
    #[Property]
    public int $maxSlots = 20;

    #[Property]
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

## Naming Convention

Component classes use noun names without suffix: `MeshRenderer`, `BoxCollider2D`, `Transform3D`.
