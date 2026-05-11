# Procedural Geometry

PHPolygon does not use external 3D model files. All geometry is generated programmatically in PHP. This is a core design principle, not a limitation.

## Primitives

```php
use PHPolygon\Geometry\BoxMesh;
use PHPolygon\Geometry\CylinderMesh;
use PHPolygon\Geometry\SphereMesh;
use PHPolygon\Geometry\PlaneMesh;
use PHPolygon\Geometry\MeshRegistry;

MeshRegistry::register('box_1x1x1', BoxMesh::generate(1.0, 1.0, 1.0));
MeshRegistry::register('cylinder', CylinderMesh::generate(radius: 1.0, height: 2.0, segments: 16));
MeshRegistry::register('sphere', SphereMesh::generate(radius: 1.0, stacks: 12, slices: 16));
MeshRegistry::register('plane', PlaneMesh::generate(10.0, 10.0));
MeshRegistry::register('wedge', WedgeMesh::generate(peakZ: 1.5));
```

## Composite Geometry

Build complex structures from code:

```php
MeshRegistry::register('building_hq', BuildingMesh::generate(
    floors: 4,
    width: 6.0,
    depth: 5.0,
    style: BuildingStyle::Industrial,
));
```

## Composite Generators

Beyond primitives, PHPolygon ships generators that build complex shapes from compact descriptors:

| Generator | Input | Output |
|---|---|---|
| `LatheMesh::generate(Vec2[] $profile, int $segments)` | 2D profile (radius, height) | Solid of revolution around Y (mugs, vases, columns, tires) |
| `SweepMesh::generate(Vec2[] $crossSection, Vec3[] $path)` | 2D cross-section + 3D path | Cross-section swept along path (handles, exhaust pipes, cables) |
| `SpokedRimMesh::generate(...)` | Rim radius, spokes count, tire dimensions | Parametric car wheel rim |
| `CarBodyMesh::generate(...)` | Length, width, height, profile | Parametric car silhouette extrusion |

```php
use PHPolygon\Geometry\LatheMesh;
use PHPolygon\Geometry\SweepMesh;
use PHPolygon\Math\Vec2;
use PHPolygon\Math\Vec3;

// Coffee mug body via lathe
$bodyProfile = [
    new Vec2(0.40, 0.00), new Vec2(0.40, 1.00),
    new Vec2(0.36, 1.00), new Vec2(0.36, 0.06), new Vec2(0.00, 0.06),
];
$body = LatheMesh::generate($bodyProfile, segments: 48);

// Mug handle via sweep
$handlePath = [
    new Vec3(0.40, 0.85, 0.0), new Vec3(0.68, 0.55, 0.0),
    new Vec3(0.40, 0.25, 0.0),
];
$handle = SweepMesh::tube(radius: 0.045, sides: 12, path: $handlePath, capEnds: true);

return MeshData::merge($body, $handle);
```

Run `bin/preview-mesh examples/meshes/mug.php` to inspect any MeshData-returning script in a viewer window.

## SVG-to-PHP Pipeline

For 2D silhouettes that should be authored in a vector editor (cars, icons, signage), `bin/svg2mesh` turns SVG outlines into committable PHP mesh classes. The pipeline runs once at authoring time; runtime sees only a fast static `Generated/<Name>Mesh::generate(): MeshData` call - no SVG parser, no XML, no surprises.

```
.svg  ->  SvgOutlineParser  ->  2D outlines (Y-up, normalised)
      ->  MeshExtruder      ->  3D MeshData (linear extrusion)
      ->  MeshRevolver      ->  3D MeshData (lathe / revolve about Y)
      ->  MeshSerializer    ->  .json intermediate (committable, diffable)
      ->  PhpMeshGenerator  ->  src/Geometry/Generated/<Name>Mesh.php
```

```bash
# Extrude an SVG outline into a 3D mesh class
bin/svg2mesh assets/svg/cars/openmoji_car.svg OpenmojiCarMesh --depth=0.4

# Revolve an SVG profile around the Y axis (tire, vase, etc.)
bin/svg2mesh assets/svg/details/tire_profile.svg TireMesh --revolve --segments=32

# Output goes to src/Geometry/Generated/<Name>Mesh.php
```

Both the generated `.php` and an `.json` sidecar are committed alongside each other; the JSON is the diffable intermediate that lets PR reviewers reason about geometry changes.

This is the canonical PHPolygon approach: **no Blender, no FBX, no .gltf**. Geometry lives in PHP code, gets diffed in PRs, and re-builds with a single command if the source SVG changes.

## MeshData

All generators return a `MeshData` value object:

```php
class MeshData
{
    public array $vertices;    // flat float array [x,y,z, x,y,z, ...]
    public array $normals;     // flat float array [nx,ny,nz, ...]
    public array $uvs;         // flat float array [u,v, u,v, ...]
    public array $indices;     // flat int array [i0,i1,i2, ...]
    public ?array $tangents;   // optional [tx,ty,tz,handedness, ...] for normal-mapped materials
}
```

The backend uploads `MeshData` to the GPU once. Meshes are referenced by string ID in draw commands.

### Combining Meshes

Use `MeshData::merge(...$meshes)` to concatenate any number of meshes into a single buffer. Indices are auto-offset; tangents are preserved iff every input has them (mixing tangent-aware + tangent-less verts would silently desync the TBN basis - dropping is the safe default).

```php
$composite = MeshData::merge($body, $handle, $lid);
```

### Tangents for Normal Mapping

Materials with `normalPattern !== null` (procedural bump maps) work without per-mesh tangents because they derive tangent space per-fragment via screen-space derivatives. For materials that need a true mesh tangent buffer:

```php
$mesh = BoxMesh::generate(2.0, 1.0, 1.5)->withComputedTangents();
// $mesh->tangents is now populated with vec4 (xyz + handedness) per vertex
```

`computeTangents()` uses an averaged-per-vertex mikkT-style calculation with stable Gram-Schmidt orthonormalisation and a normal-derived fallback for degenerate UVs (no NaN ever leaks through).

## Instancing

When the same mesh appears many times, use `DrawMeshInstanced` for a single GPU draw call:

```php
// 20 buildings  - one draw call
foreach ($this->buildingLayout() as $i => $pos) {
    $b->entity("Building_{$i}")
        ->with(new Transform3D(position: $pos))
        ->with(new MeshRenderer('building_hq', 'brick'));
}
```

The `Renderer3DSystem` automatically batches identical mesh+material pairs.

## Benefits

- Entire world is version-controlled as PHP code
- Parameters change in one place  - world updates everywhere
- No external tool dependency
- Claude Code can generate and iterate geometry directly
- GPU instancing makes large worlds cheap to render

## Naming Convention

| Concept | Convention | Example |
|---|---|---|
| Geometry generators | `*Mesh` | `BoxMesh`, `BuildingMesh` |
| Mesh IDs | `snake_case` | `'box_1x1x1'`, `'building_hq'` |
| Material IDs | `snake_case` | `'stone_wall'`, `'neon_glass'` |

## Mesh Caching

`MeshCache` provides file-based caching of generated mesh data for fast load times. `MeshCacheIO` handles serialization/deserialization. This is useful when procedural generation is expensive and the result doesn't change between runs.

## Built-in Primitives

| Generator | Parameters | Description |
|---|---|---|
| `BoxMesh::generate()` | `width`, `height`, `depth` | Axis-aligned box (24 vertices, 36 indices) |
| `CylinderMesh::generate()` | `radius`, `height`, `segments` | Cylinder |
| `SphereMesh::generate()` | `radius`, `widthSegs`, `heightSegs` | UV sphere |
| `PlaneMesh::generate()` | `width`, `height`, `widthSegs`, `heightSegs` | Flat plane |
| `WedgeMesh::generate()` | `peakZ` | Wedge/ramp |
