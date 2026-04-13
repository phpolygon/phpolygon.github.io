# What is PHPolygon?

**PHPolygon** is a standalone PHP-native game engine. The primary authoring tool is Claude Code. Worlds, characters, and game logic are written entirely in PHP  - no external 3D modelling tools (Blender, Maya, etc.) and no imported model files (`.fbx`, `.obj`, `.gltf`) are part of the workflow.

## Core Principles

- **PHP is the source of truth**  - scenes, components, geometry, and game logic are all PHP code
- **Code-driven worlds**  - geometry is generated procedurally, not imported from external tools
- **AI-first authoring**  - Claude Code generates and iterates on game content directly
- **Backend-agnostic rendering**  - game code builds a `RenderCommandList`; backends execute it
- **Visual editor**  - the [PHPolygon Editor](/guide/editor) (`phpolygon/editor`) provides a NativePHP desktop app for visual scene editing

## Production Status

The **2D renderer** (OpenGL 4.1 / NanoVG via php-glfw) is production-ready. [Code Tycoon](https://store.steampowered.com/app/2667120/Code_Tycoon/) is the first game built with PHPolygon's 2D pipeline.

The **3D renderer** is in active development with multiple backend options.

## Render Backends

| Backend | Status | Target |
|---|---|---|
| OpenGL 4.1 via php-glfw (2D/NanoVG) | **Production** | 2D games |
| OpenGL 4.1 via php-glfw (3D) | In development | 3D games |
| Metal via php-glfw (MoltenVK) | In development | 3D games (macOS) |
| Vio (hardware) | In development | 2D + 3D |
| Vulkan via php-vulkan | Phase 8 | 3D production |

## Architecture Overview

```
Game Code / Scene
      ↓  (builds)
RenderCommandList        ← pure PHP data, no GPU calls
      ↓  (executed by)
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ OpenGLRenderer3D │ MetalRenderer3D  │ VioRenderer3D │ VulkanRenderer3D │ NullRenderer3D │
│    (active)      │ (macOS/MoltenVK) │   (Vio HW)   │    (planned)     │ (headless/CI)  │
└──────────────────┴──────────────────┴───────────────┴──────────────────┴────────────────┘
```

Games are built in separate repositories and require `phpolygon/phpolygon` via Composer.

## Engine Features

Beyond rendering, PHPolygon includes:

- **Audio** - multi-channel audio with Master/Music/SFX/UI/Voice channels
- **Physics** - 2D and 3D collision detection with BVH acceleration, rigid bodies, character controllers, hinge and linear joints
- **Save system** - slot-based save/load with autosave support
- **Scene management** - scene loading (single/additive), lifecycle events, prefab registry, JSON scene transpiler
- **Input mapping** - action and axis bindings for keyboard, mouse, and gamepad
- **Environment** - day/night cycle, weather (rain/snow/storm), seasons, atmospheric simulation, wind
- **Prefabs** - procedural builders for doors, furniture, roofs, palm trees
- **Threading** - parallel subsystems for physics, audio, AI, and asset streaming via `ext-parallel`
- **Localization** - locale management with fallback chains
- **UI** - immediate-mode and retained-mode widget toolkit

## Distribution

Games compile to standalone executables with an embedded PHP runtime:

```
game-binary          ← native launcher
runtime/php          ← static PHP binary (all extensions included)
game.phar            ← engine + game logic (Opcache bytecode)
assets/              ← sounds, JSON scenes, UI layouts
resources/           ← shaders (GLSL + SPIR-V), fonts
saves/               ← user data (JSON)
mods/                ← open: PHP + assets
```
