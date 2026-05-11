# Prefabs

Prefabs are reusable, parameterised entity templates with a fluent modifier API. They are the canonical way to spawn complex composite objects (vehicles, characters, props) without hand-wiring entity hierarchies in every scene.

```php
$builder->spawn(new Car())
    ->suv()
    ->cabrio()
    ->paintedWith('car_paint_red')
    ->place(new Vec3(10, 0, 5));
```

## The Prefab Lifecycle

```
1. Game instantiates a Prefab subclass (e.g. new Car())
2. Game applies modifiers in fluent style (->suv(), ->cabrio(), ->paintedWith(...))
3. Game passes the instance to SceneBuilder::spawn(),
   which binds the builder onto the prefab and returns the same instance
4. Game calls ->place(?Vec3) to invoke build() against the bound builder,
   producing an EntityDeclaration (root + child entities)
```

The builder-binding step is what lets the modifier chain end with `->place(...)` instead of needing to thread the SceneBuilder through every modifier.

## Writing a Prefab

```php
use PHPolygon\Scene\Prefab;
use PHPolygon\Scene\SceneBuilder;
use PHPolygon\Scene\EntityDeclaration;
use PHPolygon\Math\Vec3;

class Lantern extends Prefab
{
    protected float $height = 1.8;
    protected string $glassMaterial = 'glass_clear';

    public function tall(): static
    {
        $this->height = 3.0;
        return $this;
    }

    public function paintedWith(string $glassMaterialId): static
    {
        $this->glassMaterial = $glassMaterialId;
        return $this;
    }

    public function build(SceneBuilder $builder): EntityDeclaration
    {
        $root = $builder->declare('Lantern')
            ->with(new Transform3D(position: $this->position ?? new Vec3(0, 0, 0)));

        $root->addChild(
            $builder->declare('Glass')
                ->with(new Transform3D(position: new Vec3(0, $this->height, 0)))
                ->with(new MeshRenderer('lantern_glass', $this->glassMaterial))
                ->with(new PointLight(color: new Color(1.0, 0.9, 0.6), intensity: 1.5, radius: 8.0))
        );

        return $root;
    }
}

// Usage
$builder->spawn(new Lantern())->tall()->paintedWith('glass_amber')->place(new Vec3(0, 0, 0));
```

The `Prefab` base class provides:

| Method | Purpose |
|---|---|
| `at(Vec3 $position)` | Position modifier |
| `rotated(Quaternion $rotation)` | Rotation modifier |
| `scaled(Vec3 $scale)` | Scale modifier |
| `named(string $name)` | Override the root entity name |
| `place(?Vec3 $position = null)` | Materialise the entity hierarchy |

## Vehicle Prefab: `Car`

The first reference vehicle prefab demonstrates the full modifier pattern. `Car` composes a procedural body + wheels + glass + lights + plates + grille + headlights + tail lights + door handles + exhaust into a parented entity tree.

```php
use PHPolygon\Prefab\Vehicles\Car;

// 4-car showcase via the demoLineup helper
Car::demoLineup($builder, origin: new Vec3(0, 0, 0), spacing: 7.5);
```

### Variants

| Modifier | Effect |
|---|---|
| `->sedan()` | Default chassis (4 doors, hardtop) |
| `->suv()` | Higher ground clearance, longer wheelbase |
| `->pickup()` | Cab + bed silhouette |
| `->compact()` | Shorter wheelbase + tighter body |
| `->cabrio()` | Replaces the hardtop with an open roof |
| `->hardtop()` | Restores the hardtop after `->cabrio()` |

### Material Slots

`Car::registerDefaultMaterials()` is invoked automatically; it registers `car_paint_default`, `rubber`, `car_glass_default`, `car_bumper_default`, `car_rim_default`, `car_headlight_default`, `car_taillight_default`, `car_plate_default`, `car_grille_default` only if the game has not already registered them. Pre-register custom variants and the prefab fills in only the gaps.

```php
$builder->spawn(new Car())
    ->suv()
    ->paintedWith('car_paint_yellow')   // body
    ->withGlass('glass_smoked')         // windscreen + side windows
    ->withRims('chrome_polished')       // wheel rims
    ->place(new Vec3(0, 0, 0));
```

### Per-Hook Subclassing

Every part has an `attach*()` hook that subclasses can override:

| Hook | What it builds |
|---|---|
| `attachBody()` | Chassis silhouette + paint |
| `attachWindows()` | Windshield, rear window, side panels |
| `attachBumpers()` | Front + rear trim |
| `attachLights()` | Emissive headlight + tail-light blocks |
| `attachPlates()` | License plate quads |
| `attachMirrors()` | Side mirrors |
| `attachGrille()` | Front grille |
| `attachDoorHandles()` | Door handle prefabs |
| `attachExhaust()` | Exhaust pipe via SweepMesh |
| `attachWheels()` | Tire + rim children |

Override `bodyDimensions()`, `bodyProfile()`, `wheelRadius()`, `wheelWidth()`, `wheelbaseFraction()`, `rimRadius()`, `rimWidth()` to retune the proportions for a specific vehicle without touching the per-part construction.

## Style Factories

`Car::styleSedan()`, `styleSuvCabrio()`, `styleRedPickup()`, `styleYellowCompact()` are static factories that return a fully configured `Car` instance. Subclasses inherit them automatically (`Car` returns `static`).

```php
$sedan = Car::styleSedan()->place(new Vec3(0, 0, 0));
$suv   = Car::styleSuvCabrio()->place(new Vec3(8, 0, 0));
```
