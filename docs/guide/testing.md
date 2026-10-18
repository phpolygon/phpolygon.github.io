# Headless Mode & Testing

## Headless Mode

The engine can run without a GPU, display server, or OpenGL context:

```php
$engine = new Engine(new EngineConfig(headless: true));
// All subsystems work: ECS, Scenes, Events, Audio, Locale, Saves
```

| Normal mode (VIO) | Normal mode (GLFW fallback) | Headless mode |
|---|---|---|
| `VioWindow` | `Window` (GLFW) | `NullWindow` (no-op) |
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

## 3D Scene Testing

Test 3D scenes by inspecting the command list structurally:

```php
public function testPhpDistrictBuildsCorrectly(): void
{
    $engine = $this->create3DTestEngine();
    $engine->scenes->load(PhpDistrictScene::class);
    $engine->tick(0.016);

    $commands = $engine->renderer3d->getLastCommandList();
    $draws = $commands->ofType(DrawMesh::class);

    $this->assertCount(20, $draws);
    $this->assertSame('cobblestone', $draws[0]->materialId);
}
```

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
