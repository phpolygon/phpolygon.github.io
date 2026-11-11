# Headless Mode & Testing

## Headless Mode

The engine can run without a GPU, display server, or OpenGL context:

```php
$engine = new Engine(new EngineConfig(headless: true));
// All subsystems work: ECS, Scenes, Events, Audio, Locale, Saves
```

| Normal mode (VIO) | Normal mode (GLFW fallback) | Headless mode |
|---|---|---|
| `VioMainWindow` | `Window` (GLFW) | `NullWindow` (no-op) |
| `VioRenderer2D` | `Renderer2D` (NanoVG/OpenGL) | `NullRenderer2D` (no output) |
| `VioRenderer3D` | `OpenGLRenderer3D` / `VulkanRenderer3D` | `NullRenderer3D` (stores commands) |
| `VioTextureManager` | `TextureManager` (GL textures) | `NullTextureManager` (dummy textures) |
| `VioAudioBackend` | `GLFWAudioBackend` | no audio |

## Offscreen Mode

`EngineConfig::$offscreen` is different from headless: the real Vio backends render, but into an
invisible surface (php-vio `headless`) - for screenshot tests and offline rendering. It renders on
the hardware GPU (`offscreenHardware`, default `true`) and falls back to the D3D software adapter
(WARP) only when no hardware context opens. Set `offscreenHardware: false` for images that must
match across machines.

```php
$engine = new Engine(new EngineConfig(offscreen: true, offscreenHardware: false, is3D: true));
```

Shader animation time follows the simulated time, not the frame count; screenshot tests pin it
with `Engine::setAnimationTime()`.

## 3D Scene Testing with GameTestCase

3D scenes are tested without a GPU: `NullRenderer3D` keeps the `RenderCommandList` it received, and the test inspects it structurally instead of comparing pixels. `PHPolygon\Testing\GameTestCase` is the base class for a game's own tests. It creates a fresh headless engine per test (`EngineConfig(headless: true, is3D: true)`; override `engineConfig()` to change it) and carries the helpers:

```php
use PHPolygon\Engine;
use PHPolygon\Rendering\Command\DrawMesh;
use PHPolygon\Rendering\RenderCommandList;
use PHPolygon\System\Camera3DSystem;
use PHPolygon\System\Renderer3DSystem;
use PHPolygon\Testing\GameTestCase;

final class DistrictTest extends GameTestCase
{
    // Called once per test, before it runs: register scenes, meshes, materials, systems
    protected function registerScenes(Engine $engine): void
    {
        $commands = $engine->commandList3D ?? new RenderCommandList();
        $engine->world->addSystem(new Camera3DSystem($commands, 1280, 720));
        $engine->world->addSystem(new Renderer3DSystem($engine->renderer3D, $commands));

        $engine->scenes->register('district', DistrictScene::class);
    }

    public function testDistrictBuildsCorrectly(): void
    {
        $this->loadScene('district');
        $this->assertSceneLoaded('district');
        $this->assertEntityExists('district', 'Tower_0');
        $this->tick();                        // one update step of 1/60 s

        $commands = $this->renderCommands();  // what the systems submitted this frame
        $draws = $commands->ofType(DrawMesh::class);

        $this->assertCount(3, $draws);
        $this->assertSame('cobblestone', $draws[0]->materialId);
        $this->assertDrawsMesh('box', $commands);
        $this->assertMeshDrawCount(3, $commands);
        $this->assertPointLightCount(1, $commands);
    }
}
```

| Helper | Purpose |
|---|---|
| `engineConfig()` | The `EngineConfig` of the test engine (override to change it) |
| `registerScenes(Engine $engine)` | Hook for scene, mesh, material and system registration |
| `loadScene(string $name)` | Load a registered scene |
| `tick(float $dt = 1/60, int $times = 1)` | Advance the world |
| `renderCommands()` | Render one frame and return the `RenderCommandList` the null renderer received |
| `assertSceneLoaded()`, `assertEntityExists()`, `assertEntityCount()` | Scene and entity assertions |
| `assertDrawsMesh()`, `assertMeshDrawCount()`, `assertPointLightCount()` | Assertions on the emitted 3D commands |

`renderCommands()` returns what the game's own systems submitted (for example `Renderer3DSystem`); a scene whose world has no rendering system yields an empty list.

### Pixel tests of 3D shaders

Where the picture itself is the subject, the engine renders with the real backend into an invisible surface (see [Offscreen Mode](#offscreen-mode)): `VioRenderer3D::renderToImage()` renders a `RenderCommandList` into an offscreen target and reads it back, and `PHPolygon\Testing\Shader\HeadlessShaderHarness` runs GLSL against a php-vio context that shows no window. Such tests skip where no GPU context can be opened, and their baselines are per backend - keep them out of GPU-less CI and inspect the command list there instead.

## Visual Regression Testing (2D)

PHPolygon includes a Playwright-style VRT system using a GD software renderer:

```php
class MyGameTest extends TestCase
{
    use VisualTestCase;

    public function testMainMenu(): void
    {
        $renderer = new GdRenderer2D(800, 600);
        $renderer->beginFrame();
        // ... draw scene ...
        $renderer->endFrame();

        $this->assertScreenshot($renderer, 'main-menu');
    }
}
```

- **First run:** saves reference screenshot  - test passes
- **Subsequent runs:** compares against reference  - fails on visual diff
- **Update snapshots:** `PHPOLYGON_UPDATE_SNAPSHOTS=1 vendor/bin/phpunit`

### Comparison Parameters

```php
$this->assertScreenshot($renderer, 'name',
    threshold: 0.1,           // per-pixel tolerance
    maxDiffPixels: 50,        // absolute pixel tolerance
    maxDiffPixelRatio: 0.01,  // 1% of pixels
    mask: [
        ['x' => 10, 'y' => 10, 'w' => 100, 'h' => 20],  // ignore region
    ],
);
```

### Backend-Agnostic VRT

For VRT that works with both VIO and GLFW backends:

```php
$engine = Engine::initVrt(new EngineConfig(
    title: 'VRT', width: 1280, height: 720, vsync: false,
));
// ... load fonts, render ...
$img = $engine->captureFramebuffer();  // GdImage, works with VIO and GLFW
```

`Engine::initVrt()` is the recommended way to create a test engine - it initializes the window, renderer, and engine fonts in one call. `captureFramebuffer()` returns a `GdImage` using `vio_read_pixels` (VIO) or `glReadPixels` (GLFW). The method handles Y-flip for OpenGL and resolution mismatch via resampling. Use a shared `renderScene()` method so VRT tests exercise the exact same code path as the live game.

### Snapshot Files

```
tests/MyTest.php-snapshots/
├── main-menu.png           ← reference
├── main-menu.actual.png    ← only on failure
└── main-menu.diff.png      ← only on failure (red = mismatch)
```
