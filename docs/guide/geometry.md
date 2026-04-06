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

## MeshData

All generators return a `MeshData` value object:

```php
class MeshData
{
    public array $vertices;   // flat float array [x,y,z, x,y,z, ...]
    public array $normals;    // flat float array [nx,ny,nz, ...]
    public array $uvs;        // flat float array [u,v, u,v, ...]
    public array $indices;    // flat int array [i0,i1,i2, ...]
}
```

The backend uploads `MeshData` to the GPU once. Meshes are referenced by string ID in draw commands.

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
