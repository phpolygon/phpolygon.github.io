# Built with PHPolygon

Games and projects built with the PHPolygon engine.

---

## Code Tycoon

<a href="https://store.steampowered.com/app/4347780/Code_Tycoon/" target="_blank">
  <img src="/showcase/code-tycoon-capsule.png" alt="Code Tycoon" style="max-width: 616px; width: 100%; border-radius: 8px;" />
</a>

**Code Tycoon** is a software company management simulation where you build your tech empire from a garage startup to a global corporation. Hire developers, learn programming languages, take on client projects, and ship your own products.

It is the first game built with PHPolygon and ships with the **2D renderer** (OpenGL 4.1 / NanoVG).

| | |
|---|---|
| **Engine** | PHPolygon 2D (OpenGL / NanoVG) |
| **Platform** | Windows, macOS, Linux |
| **Distribution** | Steam |
| **Authoring** | Claude Code |

<a href="https://store.steampowered.com/app/4417500/Code_Tycoon_Demo/" target="_blank">
  <img src="https://img.shields.io/badge/Steam-Play_the_Demo-171a21?style=for-the-badge&logo=steam&logoColor=white" alt="Play the Demo on Steam" />
</a>

### Gameplay

<img src="/showcase/code-tycoon-desktop.png" alt="Code Tycoon  - Desktop view" style="width: 100%; border-radius: 8px;" />

*The desktop view  - manage your company across 16 departments: development, marketing, finance, employees, and more.*

### Tech Highlights

- **Entire UI** rendered via PHPolygon's `Renderer2D` (NanoVG)  - no HTML, no browser
- **Visual Regression Testing** with PHPolygon's `GdRenderer2D` + `VisualTestCase`
- **Standalone executable** built with PHPolygon's PHAR build pipeline (embedded PHP runtime)
- **Mod support** via PHPolygon's `ModLoader` system
- Game logic, UI, and scenes are 100% PHP  - authored with Claude Code

---

## Code Rescue

<a href="https://store.steampowered.com/app/4852040/Code_Rescue/" target="_blank">
  <img src="https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4852040/26716262ed887d2146bb4164937b88f714973cc2/capsule_616x353.jpg" alt="Code Rescue" style="max-width: 616px; width: 100%; border-radius: 8px;" />
</a>

**Code Rescue** is a cozy coding game. An AI promised to take coding off everyone's hands — and Code City forgot how its own code ever worked, so the city went dark. Find the bugs, close the gaps, and bring it back to life one line at a time.

You repair real code in bite-sized pieces rather than writing it from scratch. There are no fail states and no timers — a peaceful, family-friendly puzzle adventure where the city blooms from grey and silent to colourful and alive with every fix.

It is the first game built with PHPolygon's **3D renderer**.

| | |
|---|---|
| **Engine** | PHPolygon 3D (php-vio → Metal / D3D / Vulkan / OpenGL) |
| **Platform** | Windows, macOS, Linux |
| **Distribution** | Steam (coming soon) |
| **Authoring** | Claude Code |

<a href="https://store.steampowered.com/app/4852040/Code_Rescue/" target="_blank">
  <img src="https://img.shields.io/badge/Steam-Wishlist_Now-171a21?style=for-the-badge&logo=steam&logoColor=white" alt="Wishlist Code Rescue on Steam" />
</a>

### Tech Highlights

- **3D world** rendered via PHPolygon's `Renderer3DInterface` + `RenderCommandList` — backend-agnostic across php-vio (Metal / D3D11 / D3D12 / Vulkan / OpenGL)
- **Procedural geometry** — Code City is generated entirely from PHP code, no external model files (no Blender, no FBX)
- Game logic, scenes, and shaders are 100% PHP — authored with Claude Code

---

*Building something with PHPolygon? Open a PR to add your project here.*
