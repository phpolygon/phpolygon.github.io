# What is PHPolygon?

**PHPolygon** is a standalone PHP-native game engine. The primary authoring tool is Claude Code. Worlds, characters, and game logic are written entirely in PHP  - geometry is generated procedurally, so no external 3D modelling tools (Blender, Maya, etc.) are *required* and there is no runtime model-file loader. An external mesh can optionally be *baked* once into procedural `MeshData` in the [editor](/guide/editor) (`.obj`/`.stl`/`.gltf`/`.glb`, e.g. exported from Blender); the runtime still only ever sees PHP-side geometry.

## Core Principles

- **PHP is the source of truth**  - scenes, components, geometry, and game logic are all PHP code
- **Code-driven worlds**  - geometry is generated procedurally in PHP; an external mesh can be baked once into `MeshData` in the editor, but is never loaded at runtime
- **AI-first authoring**  - Claude Code generates and iterates on game content directly
- **Backend-agnostic rendering**  - game code builds a `RenderCommandList`; backends execute it
- **Visual editor**  - the [PHPolygon Editor](/guide/editor) (`phpolygon/editor`) provides a NativePHP desktop app for visual scene editing

## Production Status

The **2D and 3D renderers** are in production with php-vio as the primary backend on every platform (Metal, D3D11/D3D12, Vulkan or OpenGL, chosen by php-vio). NanoVG/OpenGL via php-glfw and standalone Vulkan via php-vulkan remain as fallbacks where php-vio is unavailable. Games shipped on the engine are listed in the [Showcase](/showcase).

## Render Backends

| Backend | Status | Target |
|---|---|---|
| php-vio (2D + 3D unified) | **Production** | Every platform; php-vio dispatches to Metal (macOS), D3D11/D3D12 (Windows), Vulkan or OpenGL |
| OpenGL via php-glfw (2D/NanoVG) | Fallback | 2D when php-vio is unavailable (GL 3.0-4.6 ladder) |
| OpenGL via php-glfw (3D) | Fallback | 3D when php-vio is unavailable (GL 3.0-4.6 ladder, feature-tiered) |
| Vulkan via php-vulkan | Standalone | Native Vulkan 3D when php-vio is not loaded, or opted in via `useNative3D` |

The former standalone Metal renderer is retired; php-vio's Metal backend is the macOS path.

## Architecture Overview

```
Game Code / Scene
      ↓  (builds)
RenderCommandList        ← pure PHP data, no GPU calls
      ↓  (executed by)
┌────────────────┬──────────────────┬──────────────────┬────────────────┐
│ VioRenderer3D  │ OpenGLRenderer3D │ VulkanRenderer3D │ NullRenderer3D │
│   (primary)    │    (fallback)    │   (standalone)   │ (headless/CI)  │
└────────────────┴──────────────────┴──────────────────┴────────────────┘
```

Games are built in separate repositories and require `phpolygon/phpolygon` via Composer.

## Engine Features

Beyond rendering, PHPolygon includes:

- **Audio** - multi-channel audio with Master/Music/SFX/UI/Voice channels, ducking, a stem player, offline DSP and codecs (WAV, FLAC, Ogg Opus, Ogg Vorbis)
- **Speech synthesis** - offline voice lines from the translation files with cloned voices ([Speech Synthesis](/guide/speech))
- **Physics** - 2D and 3D collision detection with BVH acceleration, rigid bodies, character controllers, hinge and linear joints, raycasts and line-of-sight queries
- **Networking** - transports (Steam relay, TCP sockets, loopback), host/client sessions and a serializable command bus
- **Save system** - slot-based save/load with autosave support
- **Scene management** - scene loading (single/additive), lifecycle events, prefab registry, JSON scene transpiler
- **Input mapping** - action and axis bindings for keyboard, mouse, and gamepad, with player rebinding
- **Environment** - day/night cycle, weather (rain/snow/storm), seasons, atmospheric simulation, wind
- **Prefabs** - procedural builders for doors, furniture, roofs, palm trees
- **Threading** - parallel subsystems for physics, audio, AI, and asset streaming via `ext-parallel`
- **Localization** - locale management with fallback chains, start language from Steam or the system
- **UI** - immediate-mode and retained-mode widget toolkit

## Distribution

Games compile to standalone executables with an embedded PHP runtime - the static-php-cli
`micro.sfx` runtime and the game PHAR combined into one binary (on macOS the PHAR sits beside the
binary in the `.app`). See [Building & Distribution](/guide/building).

```
<game executable>    ← micro.sfx runtime + embedded php.ini + game PHAR (engine + game code)
assets/              ← extracted once per build: sounds, JSON scenes, UI layouts
resources/           ← extracted once per build: shaders, fonts
<external paths>     ← build.json resources.external, shipped loose (audio, video)
saves/               ← user data (JSON)
mods/                ← open: PHP + assets
```
