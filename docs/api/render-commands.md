# Render Commands

All render commands are readonly PHP value objects in `PHPolygon\Rendering\Command`. They are appended to a `RenderCommandList` during the scene tick and executed by the active backend.

## Commands

### SetCamera

```php
new SetCamera(
    viewMatrix: Mat4,
    projectionMatrix: Mat4,
)
```

### SetAmbientLight

```php
new SetAmbientLight(
    color: Color,
    intensity: float,
)
```

### SetDirectionalLight

```php
new SetDirectionalLight(
    direction: Vec3,
    color: Color,
    intensity: float,
)
```

Up to 16 directional lights per frame.

### AddPointLight

```php
new AddPointLight(
    position: Vec3,
    color: Color,
    intensity: float,
    radius: float,
)
```

Up to 8 point lights per frame.

### DrawMesh

```php
new DrawMesh(
    meshId: string,
    materialId: string,
    modelMatrix: Mat4,
)
```

### DrawMeshInstanced

Draw many copies of one mesh+material in a single GPU call. Has two equally valid storage modes.

**Mat4 mode** (default) — hand in `Mat4[]`, convenient when the caller already builds matrices:

```php
new DrawMeshInstanced(
    meshId: string,
    materialId: string,
    matrices: Mat4[],
    isStatic: bool = false,  // cache instance buffer; skip re-upload next frame
)
```

**Flat mode** — for hot paths (particles, thousands of instances), build the command from a pre-flattened, column-major `float[]` of length `instanceCount * 16`. The renderer uploads it directly, skipping the per-instance flatten loop (~6× fewer allocations):

```php
DrawMeshInstanced::flat(
    meshId: string,
    materialId: string,
    flatMatrices: float[],   // column-major, instanceCount * 16 floats
    instanceCount: int,
    isStatic: bool = false,
)
```

Both modes feed the same pipeline; backends read `hasFlatMatrices()` to pick the buffer and `effectiveInstanceCount()` for the count. Set `isStatic: true` when the transforms never change — the instance buffer is then cached on first upload and reused every frame.

### SetSkybox

```php
new SetSkybox(
    cubemapId: string,
)
```

### SetFog

```php
new SetFog(
    color: Color,
    near: float,
    far: float,
)
```

### SetShader

```php
new SetShader(
    shaderId: ?string,  // null = reset to material-driven
)
```

Override the active shader for all subsequent draw commands this frame. Pass `null` to reset. Prefer using the `Shader` facade instead of emitting this command directly.

### SetWaveAnimation

```php
new SetWaveAnimation(
    enabled: bool,
    amplitude: float,
    frequency: float,
    phase: float,
)
```

### SetWind

```php
new SetWind(
    direction: Vec3 = new Vec3(0.0, 0.0, 1.0),
    intensity: float = 0.5,
)
```

Sets global wind direction + intensity for the frame. Drives procedural cloth (`Material::cloth(...)`) and any future wind-driven effects (foliage, particles). When `intensity == 0` the cloth-anchored vertices remain fully still.

### SetSnowCover

```php
new SetSnowCover(
    coverage: float,  // 0 = no snow, 1 = full snow accumulation
)
```

### SetGroundWetness

```php
new SetGroundWetness(
    wetness: float,  // 0 = dry, 1 = soaked
)
```

### SetSkyColors

```php
new SetSkyColors(
    skyColor: Color,
    horizonColor: Color,
)
```

### SetEnvironmentMap

```php
new SetEnvironmentMap(
    textureId: int,  // GL texture handle
)
```

### SetFieldtracing

Configure [Fieldtracing](/guide/visual-quality#fieldtracing-sdf-global-illumination) (SDF global illumination) for the frame. The mode is gated against the backend's capability tier and silently degrades on hardware that cannot satisfy it.

```php
use PHPolygon\Rendering\Quality\FieldtracingMode;

new SetFieldtracing(
    mode: FieldtracingMode,       // Off | ProbesOnly | SdfOcclusion | SdfBounce
    intensity: float = 1.0,       // GI strength multiplier
    bounces: int = 1,             // ignored unless mode == SdfBounce
    aoRadius: float = 1.5,        // SDF ambient-occlusion reach (world units)
)
```

### SetFieldtracingVolume

Provide the baked Signed Distance Field volume the trace pass samples (the `SdfOcclusion` / `SdfBounce` tiers). The renderer uploads it to a GPU 3D texture and re-uploads only when `version` changes, so it can be emitted every frame cheaply — a static world bumps the version once.

```php
new SetFieldtracingVolume(
    data: string,    // RGBA8 voxels, width*height*depth*4, Z-slices ascending
    width: int,
    height: int,
    depth: int,
    origin: Vec3,    // world-space minimum corner of the volume
    size: Vec3,      // world-space extents; UVW = (p - origin) / size
    range: float,    // distance decode: (sample*2 - 1) * range
    version: int = 0,
)
```

Produce `data` with `\PHPolygon\Fieldtracing\Volume\SdfVolume::toRgba8()`. Backends without 3D-texture support ignore the command and the tier degrades to `ProbesOnly`.

### SetFieldtracingProbes

Provide the baked **coloured** irradiance probe field the `ProbesOnly` (and higher) tiers sample for directional ambient GI. The field is SH-L1: one RGBA8 3D texture per colour channel, each holding that channel's four spherical-harmonic coefficients (`R=c0, G=c1, B=c2, A=c3`) signed-encoded over `[-range, +range]`. The mesh shader reconstructs `E_rgb(n) = c0 + c1*n.x + c2*n.y + c3*n.z` per channel — the 1-bounce term is baked in.

```php
new SetFieldtracingProbes(
    dataR: string,   // red-channel SH coeffs, RGBA8, width*height*depth*4
    dataG: string,   // green-channel SH coeffs
    dataB: string,   // blue-channel SH coeffs
    width: int,
    height: int,
    depth: int,
    origin: Vec3,    // world mapping mirrors SetFieldtracingVolume
    size: Vec3,
    range: float,
    version: int = 0,
)
```

Backends without 3D-texture support ignore it and fall back to the analytic hemisphere ambient.

## RenderCommandList

```php
$list = new RenderCommandList();
$list->add(new DrawMesh('box', 'stone', Mat4::identity()));
$list->count();                          // 1
$list->isEmpty();                        // false
$list->ofType(DrawMesh::class);          // [DrawMesh]
$list->getCommands();                    // [DrawMesh]
$list->clear();
```
