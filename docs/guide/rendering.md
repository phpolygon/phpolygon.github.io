# Rendering

## Architecture

PHPolygon uses a layered rendering architecture with backend-agnostic command lists:

```
Game Code / Scene
      ↓  (builds)
RenderCommandList        ← pure PHP data, no GPU calls
      ↓  (executed by)
┌──────────────────┬──────────────────┬──────────────────┐
│ OpenGLRenderer3D │ VulkanRenderer3D │  NullRenderer3D  │
└──────────────────┴──────────────────┴──────────────────┘
```

Game code never touches GPU APIs directly. The `Renderer3DSystem` collects `MeshRenderer` + `Transform3D` components and builds a `RenderCommandList` that the active backend executes.

## Render Interfaces

```
RenderContextInterface           ← base: beginFrame, endFrame, clear, setViewport
├── Renderer2DInterface          ← NanoVG backend for 2D games
└── Renderer3DInterface          ← 3D backend (OpenGL or Vulkan)
```

## 3D Render Pipeline

The OpenGL backend uses a multi-pass system:

1. **Shadow pass** — render depth from directional light's perspective
2. **Opaque pass** — draw all meshes with `alpha >= 1.0`
3. **Transparent pass** — draw meshes with `alpha < 1.0` (back-to-front)
4. **Skybox pass** — cubemap background

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
