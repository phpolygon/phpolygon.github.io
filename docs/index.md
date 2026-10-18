---
layout: home

hero:
  name: PHPolygon
  text: PHP-native Game Engine
  tagline: AI-first authoring. Code-driven worlds. No external tools required.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Showcase
      link: /showcase
    - theme: alt
      text: View on GitHub
      link: https://github.com/phpolygon/phpolygon

features:
  - title: Pure PHP
    details: Entire game logic, scenes, and geometry written in PHP. No external tools required at runtime and no runtime model-file loader; the editor can optionally bake an external mesh once into procedural data.
  - title: ECS Architecture
    details: Hybrid Entity-Component-System with per-entity lifecycle hooks and cross-entity Systems for physics, rendering, and AI.
  - title: AI-first Authoring
    details: Claude Code is the primary authoring tool. Worlds, characters, and game logic are generated and iterated directly in PHP.
  - title: Procedural Geometry
    details: Meshes generated programmatically. Composite generators (Lathe, Sweep, SpokedRim), an SVG-to-PHP pipeline that turns 2D outlines into committable mesh classes, plus a one-time OBJ/STL/glTF import bake in the editor.
  - title: Visual Quality Stack
    details: "PBR + procedural normal/surface patterns, AO, ACES tone mapping, color grading, vignette, vol-fog, area lights, GPU particles, CSM shadows, SSR, TAA and temporal upscaling (TAAU, FSR 3, DLSS). Primary path: php-vio on Metal, D3D11/D3D12, Vulkan and OpenGL."
  - title: Procedural Cloth + Vehicle Prefabs
    details: Vertex-shader cloth sway driven by SetWind. Vehicle prefab system with Sedan/SUV/Cabrio/Pickup/Compact variants composed from procedural primitives.
  - title: Multi-Backend Rendering
    details: "2D + 3D: php-vio (production; Metal, D3D11/D3D12, Vulkan, OpenGL). Fallbacks: NanoVG/OpenGL via php-glfw, standalone Vulkan. Backend-agnostic RenderCommandList architecture."
  - title: Ship Everywhere
    details: Build standalone executables for Windows, Linux, macOS (universal .app) and iOS - one binary with embedded PHP runtime, cross-built in Docker and uploaded to Steam in one run.
---
