# Visual Quality

PHPolygon ships a player-facing visual-quality system that stacks PBR foundations, procedural patterns, and atmospheric effects on top of the standard render pipeline. The whole stack is orthogonal to existing render-scale / shadow / AA work and reuses the same off-screen pipeline. The production path is `VioRenderer3D` (php-vio on Metal, D3D11/D3D12, Vulkan or OpenGL); the standalone OpenGL renderer carries most of the stack, the standalone Vulkan renderer a minimal compatibility path.

```
┌─────────────────────────────────────────────────────────────┐
│  Phase A:  PBR foundation                                   │
│            normal patterns, surface patterns, AO, ACES,     │
│            camera-following CSM shadows                     │
├─────────────────────────────────────────────────────────────┤
│  Phase B:  Stylisation + materials                          │
│            color grading, vignette, carpaint clearcoat,     │
│            metallic flakes, IBL environment maps, wetness   │
├─────────────────────────────────────────────────────────────┤
│  Phase C:  Atmospheric / dynamic                            │
│            CSM PCF, SSR (forward-renderer surrogate),       │
│            TAA with Halton jitter, volumetric fog           │
└─────────────────────────────────────────────────────────────┘
                + GPU particles  +  area lights
```

## GraphicsSettings

Every feature is gated by a field on the immutable `GraphicsSettings` value object. The engine carries one settings instance, persisted to `saves/graphics.json` and edited via `$engine->graphics->update(...)`.

```php
use PHPolygon\Rendering\GraphicsSettings;
use PHPolygon\Rendering\Quality\ColorGradingPreset;
use PHPolygon\Rendering\Quality\ScreenSpaceAO;
use PHPolygon\Rendering\Quality\ScreenSpaceReflections;
use PHPolygon\Rendering\Quality\AntiAliasing;
use PHPolygon\Rendering\Quality\ShadowQuality;
use PHPolygon\Rendering\Quality\QualityMode;

$engine->graphics->update(fn(GraphicsSettings $s) => $s->with(
    shadowQuality: ShadowQuality::High,
    ambientOcclusion: ScreenSpaceAO::High,
    colorGrading: ColorGradingPreset::Cinematic,
    vignetteIntensity: 0.35,
    volumetricFog: true,
    ssr: ScreenSpaceReflections::High,
    antiAliasing: AntiAliasing::Taa,
));
```

::: warning Always go through the engine
Never mutate `GraphicsSettings` fields directly or call `$renderer3D->applySettings()` from game code. The immutable round-trip is what keeps change events deterministic and persistent.
:::

Every field with its default, the accessibility options, calibration, the tour benchmark and the hardware capabilities are covered in [Graphics Settings](/guide/graphics-settings).

## Phase A: PBR Foundation

### Procedural Normal Patterns

In-shader bump maps driven by a string id. **No texture uploads, no external image files.** Tangent space is derived per-fragment via screen-space derivatives, so meshes do not need to ship tangent buffers.

```php
use PHPolygon\Rendering\NormalPattern;

new Material(
    albedo: new Color(0.55, 0.50, 0.45),
    normalPattern: NormalPattern::BRICKS,    // or 'bricks' string literal
    normalScale: 4.0,                         // UV tile multiplier
    normalIntensity: 1.0,                     // bump strength
);
```

Available patterns:

| Constant | String | Use case |
|---|---|---|
| `NormalPattern::BRICKS` | `bricks` | Castle walls, urban facades |
| `NormalPattern::BUMPS` | `bumps` | Stippled plastics, leather |
| `NormalPattern::ORANGE_PEEL` | `orange_peel` | Painted metal, citrus rind |
| `NormalPattern::HAMMERED` | `hammered` | Wrought iron, hammered copper |
| `NormalPattern::HEXAGONS` | `hexagons` | Carbon fibre, honeycomb |
| `NormalPattern::WOOD_GRAIN` | `wood_grain` | Plank floors, wooden props |
| `NormalPattern::SCRATCHES` | `scratches` | Brushed metal, weathered surfaces |
| `NormalPattern::CRACKED` | `cracked` | Dried mud, ice, broken glass |
| `NormalPattern::NOISE` | `noise` | Generic high-frequency detail |

### Procedural Surface Patterns

Per-fragment modulation of albedo / roughness / metallic so a single material reads as worn / rusted / brushed without shipping ORM textures.

```php
use PHPolygon\Rendering\SurfacePattern;

new Material(
    albedo: new Color(0.85, 0.15, 0.15),
    metallic: 0.7,
    surfacePattern: SurfacePattern::WORN_PAINT,
    surfaceScale: 2.0,
    surfaceIntensity: 0.6,
);
```

Available patterns: `WORN_PAINT`, `RUST`, `BRUSHED_METAL`, `POLISHED_RINGS`.

### Screen-Space Ambient Occlusion

```php
use PHPolygon\Rendering\Quality\ScreenSpaceAO;

ScreenSpaceAO::Off       // disabled
ScreenSpaceAO::Low       // curvature term only, strength 0.4
ScreenSpaceAO::Medium    // strength 0.7 + SSAO pass (default)
ScreenSpaceAO::High      // strength 1.0 + SSAO pass
```

Two contributions are layered. Every tier above `Off` darkens corners and crevices with a curvature term derived from screen-space normal derivatives. At `Medium` and `High` the Vio renderer adds a depth + normal SSAO pass (G-buffer, hemisphere kernel, blur) on Direct3D 11/12, Vulkan and Metal; php-vio's OpenGL backend keeps the curvature term alone. `temporalSsao` accumulates the SSAO over frames while the camera holds still.

### ACES Tone Mapping

Every mesh-shader exit path runs a filmic tone curve before gamma; ACES is the default. A game can change the image chain per frame with the `SetImageLook` command and an `ImageLook` (exposure and auto exposure, `Tonemapper::Aces` or `Tonemapper::Sigmoid`, bloom chain, colour LUTs, grain, sharpening).

### Cascade Shadow Maps

| `ShadowQuality` | Shadow map resolution |
|---|---|
| `Off` | no shadow pass |
| `Low` | 1024 |
| `Medium` (default) | 2048 |
| `High` | 4096 |

The Vio renderer centres its three shadow cascades on the camera position of the frame. `shadowDistance` is stored and round-tripped, but no renderer reads it at present.

Point and spot lights can cast shadows too (`castsShadow: true` on `PointLight` / `SpotLight`).

## Phase B: Stylisation + Materials

### Color Grading

Six presets via Lift / Gamma / Gain + saturation. Applied as a post-process before vignette + tone mapping.

```php
use PHPolygon\Rendering\Quality\ColorGradingPreset;

ColorGradingPreset::Neutral     // default, no shift
ColorGradingPreset::Warm        // golden-hour bias
ColorGradingPreset::Cool        // moonlit bias
ColorGradingPreset::Cinematic   // teal/orange contrast
ColorGradingPreset::Vibrant     // saturation boost
ColorGradingPreset::Muted       // desaturated, gritty
```

### Vignette

```php
$s->with(vignetteIntensity: 0.35)  // 0.0 = off, 1.0 = heavy
```

Soft radial darkening at frame edges. Applied in the post-process stage so it composes correctly with bloom + color grading.

### Carpaint (Clearcoat + Flakes + IBL)

The `Material::carpaint(...)` factory wires up the four carpaint fields at sensible defaults. The shader path activates automatically when the material id starts with `car_paint_`.

```php
MaterialRegistry::register('car_paint_red', Material::carpaint(
    new Color(0.85, 0.15, 0.15),
    metallic: 0.7,
    roughness: 0.30,
    clearcoat: 0.7,
    flakes: 0.4,
));
```

| Field | Effect |
|---|---|
| `clearcoat` | Strength of the dielectric coat lobe (0 = off, 1 = full glossy varnish) |
| `clearcoatRoughness` | Coat-lobe roughness (small = sharp highlight, large = blurred) |
| `flakes` | Metallic flake jitter density (0 = solid colour, 1 = heavy speckling) |
| `useEnvironmentMap` | Sample IBL cubemap for true environment reflections |

### Wetness (SSR Surrogate)

```php
new Material(
    albedo: new Color(0.15, 0.15, 0.16),
    roughness: 0.9,
    wetness: 0.7,                     // 0 = dry, 1 = soaked
);
```

Reduces effective roughness, darkens albedo, and amplifies IBL contribution on up-facing fragments. Wet asphalt + polished floors read as reflective without a G-buffer ray-march pass.

### IBL Environment Maps

The renderer renders the sky into a 6-face environment cubemap once per `SetSky` change. Carpaint, chrome, and `useEnvironmentMap: true` materials sample it for reflection. Re-renders are skipped when the sky hash hasn't changed - typically a one-time cost at scene load.

## Phase C: Atmospheric / Dynamic

### Screen Space Reflections (SSR)

```php
use PHPolygon\Rendering\Quality\ScreenSpaceReflections;

ScreenSpaceReflections::Off    // wetness surrogate only
ScreenSpaceReflections::Low
ScreenSpaceReflections::High
```

On the Vio renderer the `Low` and `High` tiers run a ray-marched pass against the G-buffer and the HDR scene colour on Direct3D 11/12, Vulkan and Metal. With the tier `Off`, and on php-vio's OpenGL backend, the `wetness` of individual materials amplifies their IBL contribution instead (the surrogate described above).

### Temporal Anti-Aliasing (TAA)

```php
$s->with(antiAliasing: AntiAliasing::Taa)
```

Sub-pixel jitter + history reprojection. Cleans up specular shimmer and high-frequency normal-pattern aliasing better than FXAA without the cost of MSAA.

On Vio the temporal path needs MRT and sampled render-target depth (`VIO_FEATURE_MRT`, `VIO_FEATURE_RENDER_TARGET_DEPTH_SAMPLE`; gated per feature, not per php-vio version). The mesh shader then also writes motion vectors and a reactive mask, a resolve pass reconstructs with a Catmull-Rom history and a variance clip, and RCAS sharpens the result (`upscaleSharpness`). History resets on a camera cut (`SetCamera::$cut`), resize and settings changes. Without the features TAA falls back to FXAA.

Debug views: `PHPOLYGON_VIO_DEBUG_VIEW=motion|reactive|depth|history`; `PHPOLYGON_VIO_TEMPORAL=0` switches the temporal path off.

### Upscalers

```php
$s->with(renderScale: 0.67, upscaler: Upscaler::Taau, upscaleQuality: UpscaleQuality::Quality)
```

| `Upscaler` | What it is |
|---|---|
| `Off` | Bilinear stretch when `renderScale < 1` |
| `Fsr1` | AMD FSR 1 (EASU + RCAS), spatial |
| `Taau` | The engine's own temporal upscaler (TAA resolve at display size) |
| `Fsr3` | AMD FSR 3.1 through php-vio's native upscaler API (D3D12 / Vulkan) |
| `Dlss` | NVIDIA DLSS Super Resolution through php-vio's DLSS plugin (D3D12 / Vulkan, NVIDIA RTX) |

`UpscaleQuality` presets (`NativeAa`, `Quality`, `Balanced`, `Performance`, `UltraPerformance`, `Custom`) set the render size for the temporal upscalers. Native upscalers are offered only when php-vio reports `VIO_FEATURE_UPSCALER_NATIVE` and the provider is supported; otherwise `GraphicsCapabilities` carries the reason and the chain falls back (`Upscaler::fallbackChain()`). The runtimes ship with the game through `build.json` `upscalers` (see [Building](/guide/building#native-upscaler-runtimes)).

### Volumetric Fog

```php
$s->with(volumetricFog: true)
```

A short ray-march along the view ray with the primary directional light. Each step samples the cascade shadow map, so air the light does not reach - a room, the shadow of a building - scatters nothing. `DirectionalLight::$volumetricScale` (0..1) scales what a light scatters; the day/night system lowers it for moonlight (`DayNightCycle::$moonScattering`).

With `froxelFog: true` (and `volumetricFog` on) the fog light is computed once per frame in a view-space grid instead of a march per pixel; it needs a backend that samples scene depth.

`HeightFog`, `FogVolume` (a local box of fog) and `HeatSource` (heat haze) are components for fog that belongs to a place rather than to the whole scene.

### Anti-Aliasing Tiers

| `AntiAliasing` | Cost | Notes |
|---|---|---|
| `Off` | 0 | No AA, hard pixels |
| `Fxaa` (default) | low | Cheap fullscreen post |
| `Msaa2x` | medium | 2x raster samples |
| `Msaa4x` | high | 4x raster samples |
| `Taa` | medium | Jitter + history reprojection (Vio: motion vectors, falls back to FXAA without MRT) |

## Fieldtracing (SDF Global Illumination)

Fieldtracing sphere-traces a baked **Signed Distance Field** of the world for diffuse global illumination, soft contact shadows and ambient occlusion. It *augments* the forward stack (shadow maps, SSAO, SSR, ACES) – it does not replace it. Because the SDF/probe bake cost dominates any frame-time gain, the tier is a deliberate settings choice and is **not** part of the adaptive hot-swap stack.

```php
use PHPolygon\Rendering\Quality\FieldtracingMode;

$engine->graphics->update(fn(GraphicsSettings $s) => $s->with(
    fieldtracing: FieldtracingMode::SdfOcclusion,
));
```

| `FieldtracingMode` | Adds | Target hardware |
|---|---|---|
| `Off` (default) | forward stack only | all hardware |
| `ProbesOnly` | static coloured probe-irradiance field | weak GPUs, iPad |
| `SdfOcclusion` | + SDF ambient occlusion + soft SDF shadows | mid desktop |
| `SdfBounce` | + 1-bounce diffuse GI | high-end desktop |

The mode is evaluated against backend capability flags (`vio_supports_feature`). A backend that cannot satisfy the requested tier **silently degrades** to the highest one it can run (`SdfBounce → SdfOcclusion → ProbesOnly → Off`) – it never crashes.

### Feeding the bake

The trace pass needs the baked data uploaded once per world via three render commands (see [Render Commands](/api/render-commands#setfieldtracing)):

- **`SetFieldtracing`** – per-frame mode/intensity/AO-radius.
- **`SetFieldtracingVolume`** – the RGBA8 SDF volume (3D texture) for the `SdfOcclusion` / `SdfBounce` tiers.
- **`SetFieldtracingProbes`** – the coloured SH-L1 irradiance field (three 3D textures) for `ProbesOnly` and up.

Both data commands carry a `version`; the renderer re-uploads the GPU 3D textures only when it changes, so a static world bakes once and emits the cached command every frame for free. The volume/probe data is produced by the `PHPolygon\Fieldtracing\Volume` bakers (e.g. `SdfVolume::toRgba8()`); a parallel CPU bake at scene load keeps it off the hot path.

::: tip Requires 3D textures
Fieldtracing relies on GPU 3D textures (`vio_texture_3d`, php-vio ≥ v1.21.0) and enough sampler slots in the mesh shader (php-vio ≥ v1.21.1). On backends without 3D-texture support every tier degrades to the analytic hemisphere ambient automatically.
:::

## Particles

`ParticleEmitter` + `ParticleSystem` for sparks, smoke, dust. The hot draw loop uses a flat-float storage path; no per-particle PHP allocations once the buffer is warm.

```php
use PHPolygon\Component\ParticleEmitter;

$entity->attach(new ParticleEmitter(
    rate: 80.0,                              // particles per second
    lifetime: 1.5,                           // seconds
    velocity: new Vec3(0.0, 2.0, 0.0),       // upward
    velocityJitter: new Vec3(0.5, 0.2, 0.5), // randomness per axis
    gravity: new Vec3(0.0, -3.0, 0.0),
    startSize: 0.05,
    endSize: 0.20,
    startColor: new Color(1.0, 0.7, 0.2, 1.0),
    endColor: new Color(0.5, 0.2, 0.0, 0.0),
    maxParticles: 256,
));
```

## Adaptive Quality

Set `QualityMode::Adaptive` and the engine drops tier rungs when frame-time exceeds the budget, then climbs back up when headroom returns. The adaptive stack is a fixed dependency chain (shadow distance → AO tier → SSR tier → render scale) - texture quality and mesh LOD are deliberately kept out because hot-swap costs (re-upload, regenerate) dominate any frame-time gain.

```php
$engine->graphics->setMode(QualityMode::Adaptive);
$engine->graphics->update(fn(GraphicsSettings $s) => $s->with(targetFps: 60.0));
```

## Lights

| Component | What it is |
|---|---|
| `DirectionalLight` | Sun / moon; `volumetricScale` sets its share of the volumetric fog |
| `PointLight` | `color`, `intensity`, `radius`, optional `castsShadow` |
| `SpotLight` | `direction`, `range`, `angle`, `penumbra`, optional `castsShadow` |
| `RectAreaLight` | One-sided rectangular area light (`width`, `depth`, `range`) |
| `EmissiveAreaLight` | Lets an emissive material light its surroundings (`materialId`, `radius`) |
| `LightCone` | Visible beam of the `SpotLight` on the same entity (register `LightConeSystem`) |

`Renderer3DSystem` gives light slots to the lights whose sphere of influence touches the view, nearest first. On backends that support the world light grid, `VioRenderer3D` shades far more point lights than the classic eight.

## Opt-in Renderer Paths

These are off by default and ignored where the hardware or php-vio lacks the feature; `$engine->graphics->capabilities()` tells a settings screen what can run (see [Graphics Settings](/guide/graphics-settings#hardware-capabilities)).

| Setting | Effect | Needs |
|---|---|---|
| `rayTracedShadows`, `rayTracedReflections`, `rayTracedProbes`, `rayTracedGi` | Ray-traced sun shadows, reflections on smooth surfaces, probe-field update, one-bounce diffuse light | `VIO_FEATURE_RAY_QUERY` |
| `meshShaders` | Instanced opaque batches drawn as frustum-culled meshlets | `VIO_FEATURE_MESH_SHADER` |
| `occlusionCulling` | Hi-Z culling of meshlets hidden behind the depth prepass | `meshShaders` + `depthPrepass` |
| `bindlessMaterials` | Albedo from a texture table, per-instance textures in one draw | `VIO_FEATURE_BINDLESS` |
| `depthPrepass` | Opaque surfaces write depth first, shading then runs once per pixel | - |
| `shadingRate`, `foveatedShading` | Variable rate shading of the scene pass, coarser at the screen edges | VRS support |
| `screenSpaceGi`, `screenSpaceSss`, `microShadows` | Screen-space radiosity, subsurface scattering, cavity shadowing | MRT path |
| `bakedLight` | Sky and sun visibility baked once from the SDF (`SetBakedLight`) | a baked light volume |
| `hdrOutput`, `lowLatency` | HDR10 display output, waitable swapchain | D3D11 / D3D12 |

## Backend Support Matrix

| Feature | Vio | OpenGL (standalone) | Vulkan (standalone) |
|---|:-:|:-:|:-:|
| Normal / Surface patterns | ✅ | ✅ | minimal |
| Tone mapping | ✅ | ✅ | ✅ |
| ScreenSpaceAO | ✅ | ✅ | minimal |
| Color grading + vignette | ✅ | ✅ | minimal |
| Cascade Shadow Maps | ✅ | ✅ | minimal |
| Carpaint clearcoat | ✅ | ✅ | minimal |
| Procedural cloth | ✅ | ✅ | - |
| IBL environment maps | ✅ | ✅ | - |
| TAA | ✅ | ✅ | - |
| SSR | ✅ | ✅ | - |
| Volumetric fog | ✅ | ✅ | - |
| Fieldtracing (SDF GI) | ✅ | ✅ | - |
| Particles | ✅ | ✅ | - |
| FXAA / MSAA | ✅ | ✅ | ✅ |
| Temporal upscaling (TAAU, FSR 3, DLSS), ray tracing, mesh shaders | ✅ (per php-vio feature) | - | - |

Vio is the production target: it covers Metal, D3D11/D3D12, Vulkan and OpenGL through php-vio, and individual features are enabled per php-vio feature flag of the active backend. The standalone OpenGL and Vulkan renderers exist for environments where php-vio is unavailable; new rendering features land in `VioRenderer3D` first.

## Reference

See [Graphics Settings](/guide/graphics-settings) for every setting with its default, persistence, calibration and the adaptive controller.
