# Rendering

## Architecture

PHPolygon uses a layered rendering architecture with backend-agnostic command lists:

```
Game Code / Scene
      ↓  (builds)
RenderCommandList        ← pure PHP data, no GPU calls
      ↓  (executed by)
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ OpenGLRenderer3D │ MetalRenderer3D  │ VulkanRenderer3D │  NullRenderer3D  │
│    (active)      │ (macOS/MoltenVK) │    (planned)     │ (headless/tests) │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

Game code never touches GPU APIs directly. The `Renderer3DSystem` collects `MeshRenderer` + `Transform3D` components and builds a `RenderCommandList` that the active backend executes.

## Render Interfaces

```
RenderContextInterface           ← base: beginFrame, endFrame, clear, setViewport
├── Renderer2DInterface          ← NanoVG backend for 2D games (production)
└── Renderer3DInterface          ← 3D backend (OpenGL, Metal, or Vulkan)
```

::: info
The **2D renderer** (OpenGL/NanoVG) is production-ready  - [Code Tycoon](https://store.steampowered.com/app/2667120/Code_Tycoon/) ships with it. The **3D renderer** is in active development.
:::

## 3D Render Backends

| Backend | Class | Status | Notes |
|---|---|---|---|
| OpenGL 4.1 | `OpenGLRenderer3D` | In development | Primary 3D backend, all platforms |
| Metal (MoltenVK) | `MetalRenderer3D` | In development | macOS-native via php-glfw's Metal support |
| Vio (hardware) | `VioRenderer3D` | In development | Vio hardware renderer |
| Vulkan | `VulkanRenderer3D` | Phase 8 | High-performance production backend |
| Null | `NullRenderer3D` | Available | Headless/CI testing - stores commands for assertions |

**2D Renderers:**

| Backend | Class | Status | Notes |
|---|---|---|---|
| NanoVG (OpenGL) | `Renderer2D` | **Production** | Primary 2D backend via php-glfw |
| Vio (hardware) | `VioRenderer2D` | In development | Vio hardware 2D renderer |
| GD | `GdRenderer2D` | Available | Software renderer for visual regression tests |
| Null | `NullRenderer2D` | Available | Headless/CI testing |

All backends implement `Renderer3DInterface` / `Renderer2DInterface` and execute the same command lists. Game code is fully backend-agnostic.

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
