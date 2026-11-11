# What's New

This page lists what changed for game code since the site was last revised (engine v0.68) up to **v0.103**. Each entry names the release that brought it and links to the guide where there is one; the rest is documented in the class docblocks and in the engine's `CLAUDE.md`.

## Changed Names

| Before | Now | Since |
|---|---|---|
| `PHPolygon\Runtime\VioWindow` | `PHPolygon\Runtime\VioMainWindow` (php-vio 2.41 has a global `\VioWindow` class of its own). The old name still loads as a deprecated alias. | v0.98 |
| Standalone Metal renderer | Retired; php-vio's Metal backend is the macOS path, through `VioRenderer3D` | - |

## Graphics Settings

See [Graphics Settings](/guide/graphics-settings) for the reference.

- **Accessibility options** (v0.96 - v0.97): colour vision correction, reduced world saturation, contrast mode, reduced motion, flash limit, night boost, comfort vignette and focus dim, in `AccessibilitySettings`.
- **Hardware paths** (v0.101): ray-traced sun shadows, reflections, probe update and GI; a mesh-shader path for instanced batches with Hi-Z occlusion culling; bindless materials; depth prepass; material and foveated shading rates. All off by default and reported by `GraphicsCapabilities`.
- **Froxel fog**, **micro-shadows**, **screen-space subsurface scattering**, **screen-space radiosity**, **baked light from the SDF**, **temporal SSAO**, **sky cloud cache** as settings (v0.101).
- **GPU choice** in the settings (`GraphicsSettings::$gpu`, `GpuAdapters`) (v0.101).
- **Tour benchmark** (`TourBenchmark`): tunes the settings on a route through the game's own world (v0.101).
- **HDR10 output** through php-vio's HDR composite (v0.85).
- **SSAO, SSR and SDF-AO on Vulkan and Metal** (v0.95).

## Rendering

- **Lights**: spot light shadows, point light shadows, rectangular area lights (`RectAreaLight`), emissive area lights (`EmissiveAreaLight`), a world light grid that lifts the eight point light limit (v0.101); visible light cones for spot lights (`LightCone`, v0.102).
- **Image chain** (v0.101): `SetImageLook` with an `ImageLook` - tonemapper choice, colour grade and LUTs, auto exposure, bloom chain, finishing.
- **Fullscreen pass chain** for a game's own post effects (`FullscreenPassRegistry`), an **effect register**, uniforms and samplers for game shader snippets (`SetShaderParameter`, `SetShaderTexture`), material and instance parameters without new material ids, mesh-shader program variants (v0.93).
- **Custom fragment effects among 2D draws** (`Effect2DRegistry`, v0.94) and **SDF fonts** in the 2D renderer (`VioRenderer2D::loadSdfFont()`, v0.101).
- **Sky and weather** (v0.101): physical sky, aurora, moon phases, milky way, lightning inside the cloud volume, rain streaks, wet ground with puddles and rain rings, rainbow, snow drifts, sandstorm, season colour grade for vegetation, wind-blown leaves.
- **Fog** (v0.86, v0.101): volumetric fog that respects shadows, height fog and local fog volumes (`HeightFog`, `FogVolume`), lamp halos, sun shafts, heat haze (`HeatSource`).
- **Surfaces** (v0.101): tangent-space normal maps, splatted ground with height blend, mesh decals and decal volumes (`DecalVolume`), weathering in aging zones (`AgingVolume`), glass with Fresnel edges, lit windows with interiors, marble / sandstone / roof tiles / cobblestones, `Material::withWetness()`.
- **Water** (v0.101): water shading library, baked coast distance (`CoastField`, v0.91), wakes and ripples (`WaterDisturber`), spectral ocean.
- **Reflections** (v0.101): local reflection probes, planar reflection, calmer SSR.
- **Level of detail** (v0.101): impostor atlas, HLOD building blocks (`HlodBuilder`), GPU instance culling, LOD cross-fade.
- **Figures** (v0.101): strand hair, fur shells, rim light and hair shine materials.
- **Transparency** without depth writes and a global transparent sort (v0.76); `Color::srgb()` for sRGB hex colours (v0.74).
- **Text fixed on surfaces**: `SurfaceText`, `TextPlate`, live language switch (v0.87); glowing letters (v0.103).
- **Particles**: stretched and world-aligned particles, radial spawn shapes, active distance (v0.79).

## World Building

- **Layout sockets** (`Opening`, `MountPoint`, `MountLine`, `Zone`) so independently built level parts fit together (v0.75), and **`SceneFrame`** to place a group of declarations at an angle (v0.101). See [Scenes](/guide/scenes#layout-sockets).
- **Vegetation** (v0.82 - v0.88): a plant family generator with growth stages and LODs (`PlantGenerator`), instanced foliage with colliders (`FoliageInstances`, `FoliageInstanceSystem`), two-sided foliage lighting and foliage wind.
- **Grass blades** near the camera with quality levels (`GrassField`, `GrassSystem`, `GraphicsSettings::$grassQuality`, v0.83).
- **Ground-following surfaces** from distance fields - paths, plazas, borders, inlays (`ConformingSurfaceSet`, v0.84).
- **`EllipseLoftMesh`** - loft through elliptical cross-sections (v0.73).
- **Signal motion** (`Signals`, `SignalTrack`, `SignalSpin`, `SignalSwitch`, `SignalMotionSystem`): channels drive conveyor tracks, spins and switches (v0.101).
- **Navigation agents** follow NavMesh paths and authored waypoints (`NavMeshAgent`, `NavigationSystem`, v0.101).
- **Pose clips**: a forward-kinematics clip player for figures built from parts (`PosePlayer`, `PosePlayerSystem`, v0.101).

## Physics

- `stepHeight` on every collider, solid oriented boxes, true capsule-triangle contacts (v0.87).
- `CharacterController3D::$groundEntityId` and `GroundProbe` tell what a character stands on (v0.87). See [Physics](/guide/physics#raycasts-and-line-of-sight).

## Audio

- **Spatial audio** (v0.77 - v0.78): 3D voices, listener, attenuation, Doppler, cones, live pitch and pan, pause; native in php-vio 2.36 and newer. See [Audio](/guide/audio#spatial-audio).
- **DSP** building blocks: biquad, comb / all-pass, reverb, envelope, loop crossfade (v0.77).
- **Footstep kit**: impact and grain synthesis, variants, cadence (v0.87).
- **Speech**: further synthesizers (VoxCPM2 v0.70, MOSS-TTS v0.71); cut the breath a synthesizer leaves behind the last word (v0.92).

## UI and Runtime

- **Wrapping buttons** that never truncate their label (`UIContext::wrapButton()`, v0.72).
- **Resolution-independent panels**: `UIScale`, `ScaledRenderer2D`, `ScaledInput` (v0.85). See [UI System](/guide/ui#resolution-independent-panels).
- Scroll position API, disclosure and definition rows in `UIContext` (v0.87).
- **Frame spike recorder**: an always-on hitch log with causes and session percentiles, and **GPU time per render pass** while a profiler is active (v0.87). See [Performance Profiling](/guide/profiling#frame-spike-recorder).
- **`LoadingSequence`** for a game's loading screen (v0.90).
- **Window icon** and **application icons** for Windows, macOS and Linux from one PNG in `build.json` (v0.99). See [Building](/guide/building#application-icon).

## Testing

- **`GameTestCase`**: base class for headless game tests against the emitted render commands. See [Headless & Testing](/guide/testing#_3d-scene-testing-with-gametestcase).
