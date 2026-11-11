# Render Commands

All render commands are readonly PHP value objects in `PHPolygon\Rendering\Command`. They are appended to a `RenderCommandList` during the scene tick and executed by the active backend.

## Commands

### SetCamera

```php
new SetCamera(
    viewMatrix: Mat4,
    projectionMatrix: Mat4,
    cut: bool = false,   // first frame / teleport / camera switch: temporal passes drop their history
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
    volumetricScale: float = 1.0,  // share of this light the volumetric fog scatters
)
```

`VioRenderer3D` shades the first 4 directional lights of a frame, the standalone OpenGL renderer up to 16.

### AddPointLight

```php
new AddPointLight(
    position: Vec3,
    color: Color,
    intensity: float,
    radius: float,
    castsShadow: bool = false,
)
```

`Renderer3DSystem` emits the point lights whose sphere of influence touches the view, nearest first, capped at `Renderer3DSystem::MAX_POINT_LIGHTS` (8). A game that adds the command itself can go further: `VioRenderer3D` shades up to 512 point lights through a world light grid on backends that support it and the nearest 8 elsewhere.

### AddSpotLight

```php
new AddSpotLight(
    position: Vec3,
    direction: Vec3,
    color: Color,
    intensity: float,
    range: float,
    angle: float,
    penumbra: float,
    castsShadow: bool = false,
)
```

### AddRectLight

```php
new AddRectLight(
    center: Vec3,
    axisX: Vec3,     // half extent along the rectangle's width
    axisY: Vec3,     // half extent along its height
    color: Color,
    intensity: float,
    range: float,
)
```

### DrawMesh

```php
new DrawMesh(
    meshId: string,
    materialId: string,
    modelMatrix: Mat4,
    excludeFromGbuffer: bool = false,
    prevModelMatrix: ?Mat4 = null,  // last frame's matrix of a moved entity (motion vectors), set by Renderer3DSystem
    castShadows: bool = true,
    params: ?array = null,          // three floats for the material's shader snippet
)
```

### DrawMeshInstanced

Draw many copies of one mesh+material in a single GPU call. Has two equally valid storage modes.

**Mat4 mode** (default) – hand in `Mat4[]`, convenient when the caller already builds matrices:

```php
new DrawMeshInstanced(
    meshId: string,
    materialId: string,
    matrices: Mat4[],
    isStatic: bool = false,  // cache instance buffer; skip re-upload next frame
)
```

**Flat mode** – for hot paths (particles, thousands of instances), build the command from a pre-flattened, column-major `float[]` of length `instanceCount * 16`. The renderer uploads it directly, skipping the per-instance flatten loop (~6× fewer allocations):

```php
DrawMeshInstanced::flat(
    meshId: string,
    materialId: string,
    flatMatrices: float[],   // column-major, instanceCount * 16 floats
    instanceCount: int,
    isStatic: bool = false,
)
```

Both modes feed the same pipeline; backends read `hasFlatMatrices()` to pick the buffer and `effectiveInstanceCount()` for the count. Set `isStatic: true` when the transforms never change – the instance buffer is then cached on first upload and reused every frame.

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
    foliageMotion: float = 1.0,
    foliageFadeStart: float = 100.0,  // distance at which foliage sway starts to fade out
    foliageFadeEnd: float = 130.0,
)
```

Sets global wind direction + intensity for the frame. Drives procedural cloth (`Material::cloth(...)`) and foliage sway. When `intensity == 0` the cloth-anchored vertices remain fully still.

### SetSnowCover

```php
new SetSnowCover(
    cover: float = 0.0,  // 0 = no snow, 1 = full snow accumulation
)
```

### SetGroundWetness

```php
new SetGroundWetness(
    rainWetness: float,        // 0 = dry, 1 = soaked
    raining: float = 0.0,      // how hard it rains right now (rain rings on puddles)
    dryBelowY: ?float = null,  // world height below which nothing gets wet (interiors, caves)
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

Provide the baked Signed Distance Field volume the trace pass samples (the `SdfOcclusion` / `SdfBounce` tiers). The renderer uploads it to a GPU 3D texture and re-uploads only when `version` changes, so it can be emitted every frame cheaply – a static world bumps the version once.

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

Provide the baked **coloured** irradiance probe field the `ProbesOnly` (and higher) tiers sample for directional ambient GI. The field is SH-L1: one RGBA8 3D texture per colour channel, each holding that channel's four spherical-harmonic coefficients (`R=c0, G=c1, B=c2, A=c3`) signed-encoded over `[-range, +range]`. The mesh shader reconstructs `E_rgb(n) = c0 + c1*n.x + c2*n.y + c3*n.z` per channel – the 1-bounce term is baked in.

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

### DrawOutline

```php
new DrawOutline(
    meshId: string,
    modelMatrix: Mat4,
    color: Color,
    widthPx: float = 3.0,
)
```

Screen-space outline, drawn after the scene. The `Outline` component with `OutlineSystem` emits it for you.

### SetShaderParameter / SetShaderTexture

```php
new SetShaderParameter(name: string, value: int|float|array)
new SetShaderTexture(name: string, textureId: ?string)
```

Set a uniform or sampler that a game declared for its own shader snippets (`ProcModeShaderRegistry::declareUniform()` / `declareSampler()`) or that a fullscreen pass names. Both are sticky until set again.

### SetImageLook

```php
use PHPolygon\Rendering\PostProcess\ImageLook;

new SetImageLook(look: ?ImageLook)  // null = the engine's defaults
```

The image chain of the frame: exposure and auto exposure, tonemapper (`Tonemapper::Aces` or `Tonemapper::Sigmoid`), bloom, colour LUTs, grain, sharpening and more - see the `ImageLook` constructor.

### SetFocusRegion

```php
new SetFocusRegion(
    left: float = 0.0, top: float = 0.0, right: float = 0.0, bottom: float = 0.0,
    feather: float = 0.04,
    active: bool = true,
)
```

The screen region the accessibility option `focusDim` keeps bright (a terminal, a dialogue).

### Further commands

The engine's own systems emit these; games rarely construct them by hand: `SetSky` (procedural sky with sun, moon, clouds, lightning, aurora), `SetBakedLight` (light volume baked from the SDF), `SetGrass`, `SetSandstorm`, `SetSeasonGrade`, `SetComfortVignette`, `DrawLightCone`, `DrawWorldText`, `ClearDepthBuffer`. Their constructors document every parameter.

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
