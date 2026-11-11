# Graphics Settings

PHPolygon ships a player-facing graphics-quality system that handles persistence, first-launch calibration, hardware capabilities and optional live adaptation. A game only has to show a settings panel; the engine wires everything else. What the individual features look like is described in [Visual Quality](/guide/visual-quality).

## Quick Start

```php
use PHPolygon\Engine;
use PHPolygon\EngineConfig;
use PHPolygon\UI\GraphicsOptionsPanel;
use PHPolygon\UI\UIContext;

$engine = new Engine(new EngineConfig(
    is3D: true,
    firstLaunchCalibration: true,   // default
));

$ui = new UIContext($engine->renderer2D, $engine->input);
$panel = new GraphicsOptionsPanel($engine, $ui);

$engine->onRender(function () use ($panel, $ui, &$showSettings) {
    if (!$showSettings) {
        return;
    }
    $panel->draw(x: 40, y: 40, width: 360);
    $ui->flushOverlays();
});

$engine->run();
```

`GraphicsOptionsPanel` is a drop-in panel: it draws unsupported options non-interactive and marks them "(not supported)". A game that builds its own menu reads and writes the same settings through `$engine->graphics`.

## Reading and Changing Settings

`GraphicsSettings` is an immutable value object. The engine carries one instance in `$engine->graphics` (`GraphicsSettingsManager`):

```php
use PHPolygon\Rendering\GraphicsSettings;
use PHPolygon\Rendering\Quality\ShadowQuality;
use PHPolygon\Rendering\Quality\AntiAliasing;

$current = $engine->graphics->settings();

$engine->graphics->update(fn(GraphicsSettings $s) => $s->with(
    shadowQuality: ShadowQuality::High,
    antiAliasing: AntiAliasing::Taa,
    bloom: false,
));
```

Every `update()` call computes the new settings, persists them, applies them to the live renderer, forwards vsync to the window, the FPS cap to the game loop and anisotropy / LOD bias to the texture manager, and dispatches `GraphicsSettingsChanged` (`previous`, `current`). If nothing changed, all of that is skipped.

| When | What happens |
|---|---|
| Engine construction | The manager reads `saves/graphics.json` if it exists (`EngineConfig::$graphicsSettingsPath`) |
| Renderer created | The settings are pushed to the backend |
| First launch (no file yet) | With `firstLaunchCalibration` the auto-tuner runs a benchmark scene and writes the chosen settings |
| Player edits a setting | `update()` as above |
| Hardware changed between launches | `isRecalibrationRecommended()` returns true so the UI can prompt the player |

## Settings Reference

Every field of `GraphicsSettings` with its default. The JSON key in `graphics.json` is the field name; enums are stored by their lower-case value. The enums live in `PHPolygon\Rendering\Quality`.

### Core

| Field | Default | Meaning |
|---|---|---|
| `mode` | `QualityMode::Manual` | `Manual`, `Adaptive` (the controller tunes towards `targetFps`) or `Off` (no automatic adjustment, no first-launch calibration) |
| `targetFps` | `60.0` | Target of the adaptive controller and the calibration |
| `renderScale` | `1.0` | 0.5 - 2.0; down to 0.33 while a temporal upscaler is selected |
| `vsync` | `true` | Forwarded to the window |
| `fpsCap` | `0` | 0 = uncapped; 30, 60, 120 or 144 |
| `viewDistance` | `200.0` | Upper bound for the far distance of `SetFog` |
| `gpu` | `''` | GPU by name; `''` = automatic (see [Choosing the GPU](#choosing-the-gpu)) |

### Shadows, anti-aliasing, textures

| Field | Default | Meaning |
|---|---|---|
| `shadowQuality` | `Medium` | `Off`, `Low`, `Medium`, `High` - shadow map resolution; `Off` skips the shadow pass |
| `shadowDistance` | `50.0` | Stored and round-tripped; no renderer reads it at present |
| `cloudShadows` | `true` | Cloud shadows on the ground |
| `antiAliasing` | `Fxaa` | `Off`, `Fxaa`, `Msaa2x`, `Msaa4x`, `Taa` |
| `anisotropy` | `4` | 1, 2, 4, 8 or 16 |
| `textureQuality` | `Full` | `Full`, `Half`, `Quarter` - a LOD bias so smaller mip levels are sampled |
| `shaderQuality` | `Full` | `Full` or `Unlit` (every draw through the `unlit` shader) |
| `meshLod` | `High` | `High`, `Medium`, `Low` - read by geometry generators at world build |
| `grassQuality` | `Medium` | `Off`, `Low`, `Medium`, `High`, `Ultra`, `Realistic` |

### Image and effects

| Field | Default | Meaning |
|---|---|---|
| `hdr` | `true` | FP16 scene target; the source of the highlights |
| `bloom` | `true` | Bloom in the post chain |
| `fog` | `true` | `SetFog` distance fog |
| `ambientOcclusion` | `Medium` | `ScreenSpaceAO`: `Off`, `Low`, `Medium`, `High` |
| `temporalSsao` | `false` | SSAO accumulated over frames while the camera holds still |
| `colorGrading` | `Neutral` | `ColorGradingPreset` |
| `vignetteIntensity` | `0.0` | 0 - 1 |
| `volumetricFog` | `false` | Shadowed light scattering along the view ray |
| `froxelFog` | `false` | With `volumetricFog`: the fog light is computed once per frame in a grid over the view instead of a march per pixel |
| `ssr` | `Off` | `ScreenSpaceReflections`: `Off`, `Low`, `High` |
| `fieldtracing` | `Off` | `FieldtracingMode`: `Off`, `ProbesOnly`, `SdfOcclusion`, `SdfBounce` |
| `surfaceRelief` | `Parallax` | `Off`, `Cavity`, `Parallax` |
| `microShadows` | `false` | Direct light at a grazing angle does not reach into occluded cavities |
| `screenSpaceSss` | `false` | Screen-space subsurface scattering for materials with subsurface |
| `screenSpaceGi` | `false` | Screen-space radiosity: one bounce of the direct light between neighbouring pixels |
| `bakedLight` | `false` | Sky and sun visibility baked once from the SDF, where a light volume was provided |
| `skyCloudCache` | `false` | Raymarched clouds rendered into a cube twice a second |
| `effects` | `[]` | On/off state of a game's own effects by name (`effectEnabled($name)`) |

### Upscaling and output

| Field | Default | Meaning |
|---|---|---|
| `upscaler` | `Off` | `Off`, `Fsr1`, `Taau`, `Fsr3`, `Dlss` (see [Upscalers](/guide/visual-quality#upscalers)) |
| `upscaleQuality` | `Custom` | `NativeAa`, `Quality`, `Balanced`, `Performance`, `UltraPerformance`; `Custom` leaves `renderScale` in charge |
| `upscaleSharpness` | `0.9` | 0 = soft, 1 = strongest |
| `hdrOutput` | `false` | HDR10 display output (D3D11 / D3D12) when the display is in HDR mode; applied when the window is created |
| `hdrPaperWhite` | `200.0` | Display white in nits for `hdrOutput`, 80 - 1000 |
| `lowLatency` | `false` | The CPU runs at most one frame ahead of presentation (D3D11 / D3D12); applied when the window is created |

### Hardware paths

All off by default; each needs the named php-vio feature on the active backend and is ignored without it.

| Field | Meaning |
|---|---|
| `rayTracedShadows`, `rayTracedReflections`, `rayTracedProbes`, `rayTracedGi` | Ray-traced sun shadows, reflections on smooth surfaces, probe-field update and one-bounce diffuse light (`VIO_FEATURE_RAY_QUERY`) |
| `meshShaders` | Instanced opaque batches as frustum-culled meshlets (`VIO_FEATURE_MESH_SHADER`) |
| `occlusionCulling` | Hi-Z culling of meshlets the depth prepass hides; needs `meshShaders` and `depthPrepass` |
| `bindlessMaterials` | Albedo from the texture table, per-instance textures in one draw (`VIO_FEATURE_BINDLESS`) |
| `depthPrepass` | Opaque surfaces write depth first, shading then runs once per pixel |
| `shadingRate` | `Full`, `Half` (2x2 blocks), `Quarter` (4x4) - variable rate shading of the 3D scene pass |
| `foveatedShading` | Coarser shading at the screen edges |

## Accessibility

`AccessibilitySettings` is a value object of its own inside `GraphicsSettings` (`PHPolygon\Rendering\Accessibility`). Quality presets and the adaptive controller never touch it, and it is saved only when it differs from the defaults.

```php
use PHPolygon\Rendering\Accessibility\ColorVisionMode;

$engine->graphics->update(fn(GraphicsSettings $s) => $s->with(
    accessibility: $s->accessibility->with(
        colorVision: ColorVisionMode::Deuteranopia,
        reducedMotion: true,
        flashLimit: true,
        contrast: 0.4,
    ),
));
```

| Field | Default | Meaning |
|---|---|---|
| `colorVision` | `ColorVisionMode::Off` | `Protanopia`, `Deuteranopia`, `Tritanopia`: the image is corrected for that deficiency (3D image and 2D draw colours) |
| `colorVisionStrength` | `1.0` | 0 - 1, how much of the correction is applied |
| `colorVisionSimulate` | `false` | Developer view: show what a viewer with `colorVision` sees |
| `worldSaturation` | `1.0` | 1 = unchanged, 0 = grey; the UI keeps its colours |
| `contrast` | `0.0` | 0 - 1: steeper tone curve plus dark outlines along luminance edges |
| `reducedMotion` | `false` | Holds or slows the shader time of registered effects |
| `motionScale` | `0.25` | Speed of reduced effects while `reducedMotion` is on |
| `flashLimit` | `false` | Photosensitivity: limits how fast the mean brightness of the 3D image may change |
| `nightBoost` | `0.0` | 0 - 1: lifts the shadows of a dark image |
| `comfortVignette` | `0.0` | 0 - 1: darkens the edge of the view while the camera turns or moves fast |
| `focusDim` | `0.0` | 0 - 1: dims the 3D image outside the game's focus region (set with the `SetFocusRegion` command) |

## Adaptive Mode

```php
use PHPolygon\Rendering\Quality\QualityMode;

$engine->graphics->setMode(QualityMode::Adaptive);
$engine->graphics->setTargetFps(60.0);
```

While Adaptive is active the controller samples frame times and compares the average FPS once per second: inside 95% - 110% of the target nothing changes; below it one step down the cost-impact stack is staged; above it, sustained for 5 s, one step up. The 60 frames after any settings change or scene load are ignored as warm-up. Texture quality, mesh LOD and grass quality are not part of the stack - they are too expensive to hot-swap.

Adjustments dispatch a `QualityChangeRequest` before they apply. A listener can veto, for example during a fight:

```php
use PHPolygon\Event\QualityChangeRequest;

$engine->events->listen(QualityChangeRequest::class, function (QualityChangeRequest $e) use ($combat) {
    if ($combat->isInCombat()) {
        $e->veto();   // the controller retries later
    }
});
```

## First-Launch Calibration

```php
new EngineConfig(
    firstLaunchCalibration: true,
    graphicsSettingsPath: 'saves/graphics.json',
    benchmarkScene: CityCalibrationScene::class,   // optional, null = the built-in BenchmarkScene
);
```

Calibration runs once, right after `onInit`, when no `graphics.json` exists. The auto-tuner steps from the highest tier downward, measures each step after a warm-up, and stops as soon as the p95 frame time fits the target with 15% headroom. `GraphicsCalibrationStarted` and `GraphicsCalibrationCompleted` (with a `BenchmarkResult`) frame it. A custom benchmark scene is an ordinary `Scene` - provide one when your game's workload differs a lot from a few hundred instanced meshes and a sun.

Re-run it from an options screen with:

```php
$result = $engine->graphics->recalibrate();
```

## Tour Benchmark

`TourBenchmark` tunes the settings while the game drives through **its own world**. It renders nothing itself: the game moves the camera to the current station, applies `settings()` and feeds every rendered frame's time to `frame()`.

```php
use PHPolygon\Math\Vec3;
use PHPolygon\Rendering\Quality\TourBenchmark;
use PHPolygon\Rendering\Quality\TourStation;

$tour = new TourBenchmark(
    stations: [
        new TourStation('Harbour', new Vec3(0.0, 2.0, 0.0), new Vec3(10.0, 2.0, -5.0)),   // label, position, target
        new TourStation('Market', new Vec3(40.0, 3.0, 12.0), new Vec3(30.0, 2.0, 20.0)),
    ],
    targetFps: 60.0,
    start: $engine->graphics->settings(),
);

// every rendered frame, until $tour->done():
if ($tour->takeStationChange()) {
    $station = $tour->station();   // move the camera to $station->position, look at $station->target
}
$tour->frame($frameMs, $dt);       // frame time in ms, time step in seconds

// afterwards
$result = $tour->result();         // TourBenchmarkResult: finalSettings, stationMs, changes, aborted
```

At each station the camera settles (`settleSeconds`, 0.5 by default), then `measureFrames` (120) frame times are taken. When the frame time at `percentile` (0.99, the "1 % lows") misses the budget `1000 / targetFps`, the settings go one step down the adaptive stack and the station is measured again. After the tour, when even the slowest station keeps `headroom` (20 %) of the budget free, one step up is tried and checked on the slowest stations. `progress()` and `abort()` serve the game's progress display.

## Choosing the GPU

`GraphicsSettings::$gpu` names the adapter to render on. `GpuAdapters::available()` lists the hardware adapters php-vio reports (`name`, `type`, `vramBytes`; software rasterisers are left out), discrete cards first; `GpuAdapters::isAvailable($name)` checks one. The choice is stored by name and applied when the window opens, i.e. after a restart; a GPU that is gone falls back to automatic.

```php
use PHPolygon\Rendering\GpuAdapters;

foreach (GpuAdapters::available() as $adapter) {
    // ['name' => 'NVIDIA GeForce RTX 2080', 'type' => 'discrete', 'vramBytes' => 8601468928]
}

$engine->graphics->update(fn(GraphicsSettings $s) => $s->with(gpu: $adapterName));
```

Tools and tests can pick the adapter with the environment variable `PHPOLYGON_VIO_ADAPTER`.

## Hardware Capabilities

`$engine->graphics->capabilities()` returns a `GraphicsCapabilities` object that says what the active renderer can apply, so a menu can grey out the rest:

| Property | Covers |
|---|---|
| `msaa`, `temporalAntiAliasing` | MSAA and a real TAA pass |
| `screenSpaceReflections`, `fieldtracingSdf`, `surfaceRelief`, `screenSpaceEffects` | SSR, the SDF fieldtracing tiers, surface relief, the G-buffer passes |
| `shadingRate`, `hdrOutput`, `lowLatency` | Variable rate shading, HDR10 output, the waitable swapchain |
| `rayTracing`, `meshShaders`, `occlusionCulling`, `bindless` | The hardware paths above |
| `upscalers` | The upscalers that run here; `upscalerNote($upscaler)` says why one does not (missing runtime library, not an RTX GPU, driver too old, ...) |

The stored settings stay untouched when something is unsupported, so a `graphics.json` carried to a more capable machine keeps its choices. Without a renderer (headless, before the window opens) nothing is reported as unsupported.

Asking for DLSS can take seconds the first time on a device, so the engine asks only when DLSS is selected or a settings screen calls `capabilities()` - call it from the settings screen, not while starting up. While the answer is pending, `isUpscalerPending(Upscaler::Dlss)` is true and a stored DLSS starts on the next entry of `Upscaler::fallbackChain()`. Tell the engine about loading screens and pauses with `$engine->graphics->upscalerCutPoint()`; the switch to the prepared upscaler happens at such a cut, because the image changes there.

## Pitfalls

- **Always go through `$engine->graphics`.** Never mutate settings fields or call the renderer's `applySettings()` from game code.
- **`hdrOutput`, `lowLatency` and `gpu` apply when the window is created** - offer them with a "restart required" note.
- **MSAA may fall back to single-sample** on backends or drivers that reject the requested sample count; `capabilities()->msaa` reports whether the backend has multisampled render targets.
- **The first-launch overlay draws through `renderer2D` before the game's UI exists.** If your game needs its own setup first, pass `firstLaunchCalibration: false` and call `recalibrate()` yourself.
