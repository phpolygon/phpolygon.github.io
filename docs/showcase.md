# Built with PHPolygon

Games and projects built with the PHPolygon engine.

---

## Code Tycoon

<a href="https://store.steampowered.com/app/2667120/Code_Tycoon/" target="_blank">
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

<img src="/showcase/code-tycoon-desktop.png" alt="Code Tycoon — Desktop view" style="width: 100%; border-radius: 8px;" />

*The desktop view — manage your company across 16 departments: development, marketing, finance, employees, and more.*

### Tech Highlights

- **Entire UI** rendered via PHPolygon's `Renderer2D` (NanoVG) — no HTML, no browser
- **Visual Regression Testing** with PHPolygon's `GdRenderer2D` + `VisualTestCase`
- **Standalone executable** built with PHPolygon's PHAR build pipeline (embedded PHP runtime)
- **Mod support** via PHPolygon's `ModLoader` system
- Game logic, UI, and scenes are 100% PHP — authored with Claude Code

---

*Building something with PHPolygon? Open a PR to add your project here.*
