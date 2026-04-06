# What is PHPolygon?

**PHPolygon** is a standalone PHP-native game engine. The primary authoring tool is Claude Code. Worlds, characters, and game logic are written entirely in PHP — no external 3D modelling tools (Blender, Maya, etc.) and no imported model files (`.fbx`, `.obj`, `.gltf`) are part of the workflow.

## Core Principles

- **PHP is the source of truth** — scenes, components, geometry, and game logic are all PHP code
- **Code-driven worlds** — geometry is generated procedurally, not imported from external tools
- **AI-first authoring** — Claude Code generates and iterates on game content directly
- **Backend-agnostic rendering** — game code builds a `RenderCommandList`; backends execute it

## Render Backends

| Backend | Status | Target |
|---|---|---|
| OpenGL 4.1 via php-glfw (2D/NanoVG) | Active | 2D games |
| OpenGL 4.1 via php-glfw (3D) | Active | 3D games |
| Vulkan via php-vulkan | Phase 8 | 3D production |

## Architecture Overview

```
Game Code / Scene
      ↓  (builds)
RenderCommandList        ← pure PHP data, no GPU calls
      ↓  (executed by)
┌──────────────────┬──────────────────┬──────────────────┐
│ OpenGLRenderer3D │ VulkanRenderer3D │  NullRenderer3D  │
│    (active)      │   (planned)      │  (headless/CI)   │
└──────────────────┴──────────────────┴──────────────────┘
```

Games are built in separate repositories and require `phpolygon/phpolygon` via Composer.

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
