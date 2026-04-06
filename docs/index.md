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
    details: Entire game logic, scenes, and geometry written in PHP. No external 3D modelling tools, no imported model files.
  - title: ECS Architecture
    details: Hybrid Entity-Component-System with per-entity lifecycle hooks and cross-entity Systems for physics, rendering, and AI.
  - title: AI-first Authoring
    details: Claude Code is the primary authoring tool. Worlds, characters, and game logic are generated and iterated directly in PHP.
  - title: Procedural Geometry
    details: All meshes generated programmatically  - buildings, terrain, props. Version-controlled as code, not binary files.
  - title: Multi-Backend Rendering
    details: "2D: OpenGL/NanoVG (production). 3D: OpenGL, Metal (macOS/MoltenVK), Vulkan (planned). Backend-agnostic RenderCommandList architecture."
  - title: Ship Everywhere
    details: Build to standalone executables  - macOS .app, Linux AppImage, Windows installer. Single binary with embedded PHP runtime.
---
