# Visual Quality

PHPolygon ships a player-facing visual-quality system that stacks PBR foundations, procedural patterns, and atmospheric effects on top of the standard render pipeline. The whole stack is orthogonal to existing render-scale / shadow / AA work, reuses the same off-screen pipeline, and is wired across the OpenGL, Vio, and Metal backends. Vulkan keeps a minimal compatibility path.

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
ScreenSpaceAO::Low       // 4-tap, half-resolution
ScreenSpaceAO::Medium    // 8-tap, full-resolution (default)
ScreenSpaceAO::High      // 16-tap with bilateral blur
```

Curvature-based AO derived from screen-space normal derivatives. Free with the existing depth pre-pass.

### ACES Tone Mapping

Every mesh-shader exit path runs ACES filmic before gamma. Replaces the previous gamma-only output and gives midtones noticeably more punch. No setting - always on.

### Cascade Shadow Maps

| `ShadowQuality` | Cascades | Tap pattern |
|---|---|---|
| `Off` | 0 | hard shadows |
| `Low` | 2 cascades | 1-tap |
| `Medium` (default) | 3 cascades | 4-tap PCF |
| `High` | 4 cascades | 9-tap PCF |

Shadow camera follows the player and snaps to texels to suppress shimmer. `shadowDistance` controls the far-cascade reach.

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

`MetalCubemapTarget` (Metal) and the OpenGL cubemap pipeline render the sky into a 6-face cubemap once per `SetSky` change. Carpaint, chrome, and `useEnvironmentMap: true` materials sample it for reflection. Re-renders are skipped when the sky hash hasn't changed - typically a one-time cost at scene load.

## Phase C: Atmospheric / Dynamic

### Screen Space Reflections (SSR)

Forward-renderer compatible SSR surrogate. `wetness` on individual materials drives a per-fragment IBL amplification; the global `ssr` setting controls how aggressively this amplification reads.

```php
use PHPolygon\Rendering\Quality\ScreenSpaceReflections;

ScreenSpaceReflections::Off    // no amplification
ScreenSpaceReflections::Low    // mild boost
ScreenSpaceReflections::High   // mirror-like wet surfaces
```

### Temporal Anti-Aliasing (TAA)

```php
$s->with(antiAliasing: AntiAliasing::Taa)
```

Halton-sequence sub-pixel jitter + history reprojection. Cleans up specular shimmer and high-frequency normal-pattern aliasing better than FXAA without the cost of MSAA. Falls back to FXAA when the backend cannot allocate a history target.

### Volumetric Fog

```php
$s->with(volumetricFog: true)
```

Per-fragment ray-march in screen space with the directional light. Exits are early-outed at scene-fog far-distance so the overhead is negligible in clear weather and ramps with `Weather::fogIntensity`.

### Anti-Aliasing Tiers

| `AntiAliasing` | Cost | Notes |
|---|---|---|
| `Off` | 0 | No AA, hard pixels |
| `Fxaa` (default) | low | Cheap fullscreen post |
| `Msaa2x` | medium | 2x raster samples |
| `Msaa4x` | high | 4x raster samples |
| `Taa` | medium | Halton jitter + history reprojection |

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

## Backend Support Matrix

| Feature | OpenGL | Vio | Metal | Vulkan |
|---|:-:|:-:|:-:|:-:|
| Normal / Surface patterns | ✅ | ✅ | ✅ | minimal |
| ACES tone mapping | ✅ | ✅ | ✅ | ✅ |
| ScreenSpaceAO | ✅ | ✅ | ✅ | minimal |
| Color grading + vignette | ✅ | ✅ | ✅ | minimal |
| Cascade Shadow Maps | ✅ | ✅ | ✅ | minimal |
| Carpaint clearcoat | ✅ | ✅ | ✅ | minimal |
| Procedural cloth | ✅ | ✅ | ✅ | - |
| IBL environment maps | ✅ | ✅ | ✅ | - |
| TAA | ✅ | ✅ | ✅ | - |
| SSR (wetness surrogate) | ✅ | ✅ | ✅ | - |
| Volumetric fog | ✅ | ✅ | ✅ | - |
| Particles | ✅ | ✅ | ✅ | - |
| FXAA / MSAA | ✅ | ✅ | ✅ | ✅ |

The OpenGL / Vio / Metal trio is the production target. The Vulkan backend keeps a minimal compatibility path so the engine still runs in environments where vio is unavailable and Vulkan is the only option (older Linux setups).

## Reference

For per-tier defaults, persistence layout, calibration, and the adaptive controller's tuning knobs, see `docs/graphics-settings.md` in the engine repo.
