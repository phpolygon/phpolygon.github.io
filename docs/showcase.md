# Built with PHPolygon

Games and projects built with the PHPolygon engine.

---

## Code Tycoon

<a href="https://store.steampowered.com/app/4347780/Code_Tycoon/" target="_blank">
  <img src="/showcase/code-tycoon-capsule.png" alt="Code Tycoon" style="max-width: 616px; width: 100%; border-radius: 8px;" />
</a>

**Code Tycoon** is a software company management simulation where you build your tech empire from a garage startup to a global corporation. Hire developers, learn programming languages, take on client projects, and ship your own products.

It is the first game built with PHPolygon and is **released on Steam**, running on the **2D renderer** across every backend  - Vio (Metal / D3D11 / D3D12 / Vulkan) as the primary path, with NanoVG/OpenGL as fallback.

| | |
|---|---|
| **Engine** | PHPolygon 2D (Vio → Metal / D3D11 / D3D12 / Vulkan; NanoVG/OpenGL fallback) |
| **Platform** | Windows, macOS, Linux |
| **Distribution** | Steam |
| **Authoring** | Claude Code |

<a href="https://store.steampowered.com/app/4347780/Code_Tycoon/" target="_blank">
  <img src="https://img.shields.io/badge/Steam-Available_Now-171a21?style=for-the-badge&logo=steam&logoColor=white" alt="Available now on Steam" />
</a>
&nbsp;
<a href="https://store.steampowered.com/app/4417500/Code_Tycoon_Demo/" target="_blank">
  <img src="https://img.shields.io/badge/Steam-Play_the_Demo-2a475e?style=for-the-badge&logo=steam&logoColor=white" alt="Play the Demo on Steam" />
</a>

### Gameplay

<img src="/showcase/code-tycoon-desktop.png" alt="Code Tycoon  - Desktop view" style="width: 100%; border-radius: 8px;" />

*The desktop view  - manage your company across 16 departments: development, marketing, finance, employees, and more.*

### Tech Highlights

- **Entire UI** rendered via PHPolygon's `Renderer2D`  - Vio (hardware-accelerated on Metal / D3D11 / D3D12 / Vulkan) with NanoVG/OpenGL fallback, no HTML, no browser
- **Visual Regression Testing** with PHPolygon's `GdRenderer2D` + `VisualTestCase`
- **Standalone executable** built with PHPolygon's PHAR build pipeline (embedded PHP runtime)
- **Mod support** via PHPolygon's `ModLoader` system
- Game logic, UI, and scenes are 100% PHP  - authored with Claude Code

---

## Code Rescue

<a href="https://store.steampowered.com/app/4852040/Code_Rescue/" target="_blank">
  <img src="/showcase/code-rescue-capsule.jpg" alt="Code Rescue" style="max-width: 616px; width: 100%; border-radius: 8px;" />
</a>

**Code Rescue** is an interactive programming-learning game: complete code, fix bugs, and solve puzzles inside a living **3D city** that visually evolves as you progress  - from a first "Tutorial Island" to a fully built-out CodeCity.

It is PHPolygon's **3D** showcase title and is currently **in development**. Wishlist it on Steam to follow along.

| | |
|---|---|
| **Engine** | PHPolygon 3D via php-vio (Metal / D3D11 / D3D12 / Vulkan / OpenGL) |
| **Platform** | Windows, macOS, Linux |
| **Distribution** | Steam (in development) |
| **Authoring** | Claude Code |

<a href="https://store.steampowered.com/app/4852040/Code_Rescue/" target="_blank">
  <img src="https://img.shields.io/badge/Steam-Wishlist-171a21?style=for-the-badge&logo=steam&logoColor=white" alt="Wishlist Code Rescue on Steam" />
</a>

### Gameplay

<img src="/showcase/code-rescue-screenshot.jpg" alt="Code Rescue  - Tutorial Island" style="width: 100%; border-radius: 8px;" />

*Tutorial Island at night  - a fully 3D scene rendered through php-vio, with the XP/progression HUD drawn by PHPolygon's UI toolkit.*

### Tech Highlights

- **Procedural 3D city** - districts, buildings, and props generated in PHP; the world changes as the player progresses
- **php-vio rendering** - hardware-accelerated 3D across Metal, D3D11/D3D12, Vulkan, and OpenGL from a single PHP codebase
- **Standalone executable** built with PHPolygon's PHAR build pipeline (embedded PHP runtime)
- Scenes, components, and game logic are 100% PHP  - authored with Claude Code

---

*Building something with PHPolygon? Open a PR to add your project here.*
