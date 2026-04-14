# Rendering

## Architecture

PHPolygon uses a layered rendering architecture with backend-agnostic command lists:

```
Game Code / Scene
      ↓  (builds)
RenderCommandList        ← pure PHP data, no GPU calls
      ↓  (executed by)
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  VioRenderer3D   │ OpenGLRenderer3D │ MetalRenderer3D  │ VulkanRenderer3D │  NullRenderer3D  │
│   (primary)      │   (fallback)     │ (macOS/MoltenVK) │    (planned)     │ (headless/tests) │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

Game code never touches GPU APIs directly. The `Renderer3DSystem` collects `MeshRenderer` + `Transform3D` components and builds a `RenderCommandList` that the active backend executes.

## Render Interfaces

```
RenderContextInterface           ← base: beginFrame, endFrame, clear, setViewport
├── Renderer2DInterface          ← NanoVG backend for 2D games (production)
└── Renderer3DInterface          ← 3D backend (OpenGL, Metal, or Vulkan)
```

::: info
The **2D renderer** is production-ready with VIO as the primary backend and NanoVG/OpenGL as fallback - [Code Tycoon](https://store.steampowered.com/app/2667120/Code_Tycoon/) ships with it. The **3D renderer** is in active development.
:::

## 3D Render Backends

| Backend | Class | Status | Notes |
|---|---|---|---|
| OpenGL 4.1 | `OpenGLRenderer3D` | In development | Primary 3D backend, all platforms |
| Metal (MoltenVK) | `MetalRenderer3D` | In development | macOS-native via php-glfw's Metal support |
| Vio (hardware) | `VioRenderer3D` | **Production** | Primary 3D backend via php-vio |
| Vulkan | `VulkanRenderer3D` | Phase 8 | High-performance production backend |
| Null | `NullRenderer3D` | Available | Headless/CI testing - stores commands for assertions |

**2D Renderers:**

| Backend | Class | Status | Notes |
|---|---|---|---|
| Vio (hardware) | `VioRenderer2D` | **Production** | Primary 2D backend via php-vio |
| NanoVG (OpenGL) | `Renderer2D` | **Production** | Fallback 2D backend via php-glfw |
| GD | `GdRenderer2D` | Available | Software renderer for visual regression tests |
| Null | `NullRenderer2D` | Available | Headless/CI testing |

All backends implement `Renderer3DInterface` / `Renderer2DInterface` and execute the same command lists. Game code is fully backend-agnostic.

### Metal vs OpenGL 2D Performance

Benchmarked on Apple M2 Pro (1280x720, VSync off). Measures draw + flush time only.

| Scenario | Metal | OpenGL | Delta |
|---|---|---|---|
| 500 rects | 192 us | 179 us | +7% |
| 200 rects + 200 rounded rects + 50 text | 323 us | 313 us | +3% |
| 1000 rects + 100 text | **301 us** | 374 us | **-20%** |

Metal is slightly slower on simple scenes but **20% faster on heavy scenes** with 1000+ draw calls. Tail latency (p95/p99) is **30-40% better** with Metal, meaning fewer frame time spikes.

On Intel Macs the difference is more dramatic because macOS translates OpenGL calls through a Metal compatibility layer — using Metal directly eliminates this overhead.

::: tip Backend Auto-Selection
The engine auto-detects available backends at startup:

```
if extension_loaded('vio') && !headless:
    → VioWindow, VioInput, VioRenderer2D, VioRenderer3D, VioTextureManager, VioAudioBackend
    → VIO internally selects: Metal (macOS) > Vulkan (Linux) > D3D12/D3D11 (Windows) > OpenGL
else:
    → GLFW Window, GLFW Input, NanoVG Renderer2D
    → 3D backend from config: 'opengl' | 'vulkan' | 'metal' | 'null'
if headless:
    → NullWindow, NullRenderer2D, NullRenderer3D, NullTextureManager
```

When php-vio is available, it is always preferred for all rendering, input, and audio subsystems. The GLFW/NanoVG/OpenGL stack serves as a fallback when php-vio is not installed.
:::

## Fallback Font Chain

`VioRenderer2D` supports a per-glyph fallback font system for locales that need additional Unicode coverage (e.g. CJK, Hangul):

```php
// Register fallback fonts for a base font
$r2d->addFallbackFont('inter-semibold', 'noto-sans-sc');
$r2d->addFallbackFont('inter-semibold', 'noto-sans-kr');

// Pre-bake the font atlas at commonly used sizes to avoid runtime stutter
$r2d->preloadFonts([15.0, 26.0]);

// Remove all fallback registrations (e.g. when switching to a non-CJK locale)
$r2d->clearFallbackFonts();
```

The primary font renders first; fallback fonts then fill in any missing glyphs on a per-glyph basis. `measureText()` uses the full chain for width calculation. The Vio font atlas is 4096x4096 with multi-range Unicode support (Latin, Cyrillic, Greek, CJK, Hangul, Vietnamese).

The engine automatically loads **Noto Sans SC** and **Noto Sans KR** as fallback fonts from `resources/fonts/noto-sans-cjk/` when CJK locale support is needed. UIContext text rendering automatically benefits from any fallback fonts configured on the renderer.

## 3D Render Pipeline

The OpenGL backend uses a multi-pass system:

1. **Shadow pass**  - render depth from directional light's perspective
2. **Opaque pass**  - draw all meshes with `alpha >= 1.0`
3. **Transparent pass**  - draw meshes with `alpha < 1.0` (back-to-front)
4. **Skybox pass**  - cubemap background

## Render Commands

Commands are plain PHP value objects appended to the `RenderCommandList`:

| Command | Purpose |
|---|---|
| `SetCamera` | View + projection matrices |
| `SetAmbientLight` | Ambient color + intensity |
| `SetDirectionalLight` | Directional light (up to 16) |
| `AddPointLight` | Point light (up to 8) |
| `DrawMesh` | Single mesh draw |
| `DrawMeshInstanced` | GPU-instanced mesh (many copies, one draw call) |
| `SetSkybox` | Cubemap skybox |
| `SetFog` | Distance fog |
| `SetShader` | Override active shader for subsequent draws |
| `SetWaveAnimation` | Wave vertex animation (amplitude, frequency, phase) |
| `SetSkyColors` | Sky gradient (sky color, horizon color) |
| `SetEnvironmentMap` | PBR environment map |

## Materials

Materials define PBR surface properties:

```php
use PHPolygon\Rendering\Material;
use PHPolygon\Rendering\MaterialRegistry;
use PHPolygon\Rendering\Color;

MaterialRegistry::register('brick', new Material(
    albedo: new Color(0.7, 0.3, 0.2),
    roughness: 0.8,
    metallic: 0.0,
));

MaterialRegistry::register('chrome', new Material(
    albedo: new Color(0.9, 0.9, 0.9),
    roughness: 0.1,
    metallic: 1.0,
    shader: 'default',  // optional: specify shader
));
```

## GPU Instancing

When the same mesh appears multiple times, use `DrawMeshInstanced` for a single GPU draw call:

```php
$matrices = [];
foreach ($buildingPositions as $pos) {
    $matrices[] = Mat4::translation($pos->x, $pos->y, $pos->z);
}
$commandList->add(new DrawMeshInstanced('building', 'brick', $matrices, isStatic: true));
```

The `isStatic` flag caches the matrix buffer across frames for maximum performance.

## Material Presets

PHPolygon ships with built-in material presets for common surface types:

| Class | Materials |
|---|---|
| `WoodMaterials` | Wood texture variants |
| `MetalMaterials` | Metal texture variants |
| `FabricMaterials` | Fabric texture variants |
| `ThatchMaterials` | Thatch texture variants |

## Procedural Sky

The engine includes `ProceduralSky` for skybox generation without external textures (gradient, sun, stars). Use with `ProceduralCubemap` and `CubemapRegistry` for PBR environment lighting.

## Shadow Mapping

`ShadowMapRenderer` provides depth-only shadow passes from directional lights. `CloudShadowRenderer` adds cloud shadow projection.
