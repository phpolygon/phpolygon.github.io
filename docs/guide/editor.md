# Editor

::: info Actively developed
The PHPolygon Editor is under active development. It is functional across the workspaces described below; APIs may still change.
:::

The PHPolygon Editor is a **NativePHP desktop application** for visual game authoring. It runs as a standalone app (Electron + Laravel + Vue 3) with direct filesystem access to game projects  - no HTTP server or IPC required.

**Repository:** [phpolygon/editor](https://github.com/phpolygon/editor)

## Overview

The editor lets you visually compose scenes, manage entities and components, and author meshes, materials, shaders, audio, and UI  - saving everything back as PHP scene files and asset files. The center panel is a **live viewport** (a three.js WebGL preview) with an orbit camera, click-to-select, and move/rotate/scale gizmos; it approximates the scene so you can edit spatially. The actual game still renders through the engine's own backends at runtime.

```
┌──────────────────────────────────────────────────────────────┐
│  Toolbar: Workspace tabs │ Open Project │ Play/Stop │ Save … │
├────────────┬─────────────────────────┬───────────────────────┤
│            │                         │                       │
│  Hierarchy │    Live Viewport        │    Inspector          │
│  / left    │    (3D or 2D preview,    │    / right panel      │
│   panel    │     gizmos, select)      │    (properties,       │
│            │                         │     graph, presets)   │
│            ├─────────────────────────┤                       │
│            │  Asset Browser          │                       │
│            │                         │                       │
├────────────┴─────────────────────────┴───────────────────────┤
│  Status Bar                                                  │
└──────────────────────────────────────────────────────────────┘
```

## Workspaces

The editor is organised into workspaces, each a toolbar tab that swaps the three panel zones (registered in `resources/js/workspaces.ts`):

| Workspace | Purpose |
|---|---|
| **Scene** | Compose scenes: entity hierarchy, live 3D/2D viewport, component inspector |
| **UI** | Author retained-mode UI layouts (widget tree → `*.ui.json`, transpiled to PHP) |
| **Panels** | Lay out HUD/tool panels on a canvas |
| **Audio** | Design SFX/audio presets with a live preview |
| **Mesh** | Build geometry via a procedural node graph, vertex editing, or file import |
| **Material** | Author materials with a live preview |
| **Shader** | Build shaders from a node graph with a live preview |

Beyond editing, the editor can **scaffold a new game project** (`create_game_project`) and install its Composer dependencies (`install_project_dependencies`).

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | NativePHP 2.x (Electron) |
| Backend | Laravel 11 (PHP 8.2+) |
| Frontend | Vue 3 + TypeScript + Pinia |
| Styling | Tailwind CSS (dark theme) |
| Icons | Lucide |
| Build | Vite 6 |

## Installation

```bash
git clone https://github.com/phpolygon/editor.git
cd editor
composer install
npm install
```

The editor depends on `phpolygon/phpolygon` via a local path repository. Ensure the engine repo sits next to the editor:

```
Projekte/
├── phpolygon/          ← engine
└── editor/             ← editor (references ../phpolygon)
```

## Running

```bash
# Development (Laravel + Vite hot-reload)
composer dev

# As NativePHP desktop app
composer native:dev
```

## Architecture

### Command Bus

All editor operations flow through a **Command Bus** pattern. The frontend dispatches named commands via HTTP; the backend resolves and executes them:

```
Vue Component → Pinia Store → Bridge API → POST /api/editor/command
    → EditorCommandBus → CommandInterface::execute(EditorContext)
    → Modifies SceneDocument → JSON response → Store update → Re-render
```

### Available Commands

Commands are grouped by domain. Every operation - scenes, entities, meshes, materials, shaders, audio, UI, and project scaffolding - flows through the same bus.

**Scenes & entities**

| Command | Purpose |
|---|---|
| `load_scene` / `save_scene` | Load PHP scene → JSON / transpile JSON back to a PHP scene file |
| `create_scene` / `list_scenes` / `expand_scene` | Create, list, and expand scenes |
| `create_entity` / `delete_entity` / `rename_entity` | Entity CRUD |
| `reparent_entity` | Move entity in hierarchy (drag & drop) |
| `get_entity_hierarchy` | Fetch entity tree |
| `create_primitive` / `create_sprite` | Add a primitive mesh entity or a sprite entity |

**Components**

| Command | Purpose |
|---|---|
| `add_component` / `remove_component` | Attach / detach a component |
| `update_property` | Update a component property |
| `list_components` | Fetch all components by category |
| `get_component_schema` | Reflect a component class for the inspector UI |

**Meshes, materials, shaders, audio**

| Command | Purpose |
|---|---|
| `list_meshes` / `list_mesh_assets` / `get_mesh` / `load_mesh_asset` | Discover and load mesh assets under `assets/meshes/` |
| `evaluate_procedural_mesh` | Evaluate a procedural-mesh node graph to `MeshData` |
| `save_mesh` | Save a procedural graph **or** baked raw geometry (vertex-edited / imported) as a mesh asset |
| `list_materials` / `list_material_assets` / `get_material` / `save_material` | Material discovery, load, and save |
| `save_shader` | Save a shader authored in the shader graph |
| `save_audio` | Save an audio/SFX preset |

**Prefabs & content**

| Command | Purpose |
|---|---|
| `list_prefabs` / `spawn_prefab` / `save_prefab` | JSON prefab discovery, spawn, and save |
| `list_code_prefabs` / `spawn_code_prefab` | Discover and spawn code-defined prefabs |

**UI & panel layouts**

| Command | Purpose |
|---|---|
| `create_ui_layout` / `list_ui_layouts` / `load_ui_layout` | Widget-tree UI layout lifecycle |
| `add_widget` / `remove_widget` / `reparent_widget` / `update_widget_property` | Widget-tree editing |
| `set_widget_binding` / `set_widget_event` | Wire data bindings and events |
| `render_ui_layout` / `transpile_ui_layout` / `list_widget_types` | Preview, transpile to PHP, list widget types |
| `create_panel_layout` / `list_panel_layouts` / `load_panel_layout` / `save_panel_layout` | Panel layout lifecycle |
| `add_layout_element` / `remove_layout_element` / `rename_layout_element` / `update_layout_element` | Panel element editing |

**Project & history**

| Command | Purpose |
|---|---|
| `create_game_project` | Scaffold a new PHPolygon game project |
| `install_project_dependencies` | Install the project's Composer dependencies |
| `undo` / `redo` | Undo / redo (100-level stack) |

### SceneDocument

The in-memory scene representation. Supports:

- Entity CRUD with hierarchical parent/child relationships
- Component attach/detach with default values from reflection
- Property updates with type validation
- **Undo/Redo** via JSON snapshots (max 100 levels)
- Dirty flag for unsaved changes

### Component Discovery

The editor auto-discovers engine and game components via **PHP Reflection**:

1. Scans PSR-4 namespace roots for classes implementing `ComponentInterface`
2. Filters for `#[Serializable]` attribute
3. Extracts property metadata via `#[Property]`, `#[Range]`, `#[Category]`, `#[Hidden]`
4. Builds `ComponentSchema` with types, defaults, and editor hints

This means custom game components automatically appear in the editor's "Add Component" menu and inspector panel  - no manual registration needed.

### Inspector Field Editors

The inspector auto-generates UI based on property types:

| Property type | Editor widget |
|---|---|
| `string` | Text input |
| `int` | Number input (step 1) |
| `float` | Number input (step 0.1) |
| `bool` | Checkbox |
| `Vec2` | X/Y side-by-side inputs |
| `Vec3` | X/Y/Z side-by-side inputs |
| `Color` | Color picker (hex) |
| `float` + `#[Range]` | Slider with min/max |
| `float` + `editorHint: 'angle'` | Angle input (degrees) |
| `string` + `editorHint: 'asset:*'` | Asset picker button |

## Mesh Authoring & Import

The editor includes a mesh workspace for building reusable geometry assets (saved under `assets/meshes/`):

- **Procedural graph** - compose meshes from a node graph (primitives + operations), evaluated to `MeshData` via `evaluate_procedural_mesh` and saved with `save_mesh`.
- **Vertex editing** - edit baked geometry directly and save the raw `MeshData`.
- **File import** - the **Import file…** button imports an external model (`.obj`, `.stl`, `.gltf`, `.glb`, e.g. exported from Blender) and **bakes it once** into flat `MeshData`, saved as a raw mesh asset just like a vertex-edited mesh.

The import is a **one-time conversion**, not a runtime dependency. PHPolygon has no runtime model-file loader by design: an imported mesh is centred, normalised, flattened to vertex/normal/uv/index arrays, and from then on behaves exactly like a procedurally generated mesh. No model file ships with the game - only the baked `MeshData` asset. See [Geometry](/guide/geometry) for the procedural-first authoring model this fits into.

## Project Manifest

Each game project has a `phpolygon.project.json` that the editor reads:

```json
{
  "_format": 1,
  "name": "MyGame",
  "version": "0.1.0",
  "engineVersion": "0.9.0",
  "scenesPath": "src/Scene",
  "assetsPath": "assets",
  "psr4Roots": {
    "App\\": "src/"
  },
  "entryScene": "MainScene"
}
```

The editor uses `psr4Roots` to discover game-specific components and systems alongside the engine's built-in ones.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` | Save scene |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Delete` | Remove selected entity |
| `F2` | Rename selected entity |

## Relationship to the Engine

The editor is a **consumer** of the engine, not part of it:

- The engine (`phpolygon/phpolygon`) is a Composer dependency of the editor
- The editor reads engine component classes via reflection at runtime
- Scene files are PHP code (canonical) ↔ JSON (editor interchange)
- The editor's viewport is a **three.js WebGL preview** for authoring, not the engine's renderer  - the shipping game renders through the engine's own backends (Vio / OpenGL / Vulkan / Metal)
- All authored content (scenes, meshes, materials, shaders, audio, UI) is written back as PHP code and asset files the engine consumes directly
