# Editor

::: warning Work in Progress
The PHPolygon Editor is under active development and not yet feature-complete. The architecture and command set described below reflect the current design — APIs may change.
:::

The PHPolygon Editor is a **NativePHP desktop application** for visual scene editing. It runs as a standalone app (Electron + Laravel + Vue 3) with direct filesystem access to game projects — no HTTP server or IPC required.

**Repository:** [phpolygon/editor](https://github.com/phpolygon/editor)

## Overview

The editor lets you visually compose scenes, manage entities and components, and save them as PHP scene files. It is a **data editor**, not a real-time viewport — the game renders in a separate OpenGL/Vulkan window when play mode is active.

```
┌──────────────────────────────────────────────────────┐
│  Toolbar: Open Project │ Play/Stop │ Save │ Undo/Redo │
├────────────┬─────────────────────┬───────────────────┤
│            │                     │                   │
│  Hierarchy │    Scene View       │    Inspector      │
│  (Entity   │    (placeholder)    │    (Component     │
│   Tree)    │                     │     Properties)   │
│            │                     │                   │
│            ├─────────────────────┤                   │
│            │  Asset Browser      │                   │
│            │                     │                   │
├────────────┴─────────────────────┴───────────────────┤
│  Status Bar                                          │
└──────────────────────────────────────────────────────┘
```

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

| Command | Purpose |
|---|---|
| `load_scene` | Load PHP scene, transpile to JSON |
| `save_scene` | Transpile JSON back to PHP scene file |
| `list_scenes` | List available scene files |
| `create_entity` | Add entity to scene |
| `delete_entity` | Remove entity |
| `rename_entity` | Rename entity |
| `reparent_entity` | Move entity in hierarchy (drag & drop) |
| `add_component` | Attach component to entity |
| `remove_component` | Detach component |
| `update_property` | Update a component property |
| `get_entity_hierarchy` | Fetch entity tree |
| `list_components` | Fetch all components by category |
| `get_component_schema` | Reflect component class for inspector UI |
| `undo` | Undo last change (100-level stack) |
| `redo` | Redo after undo |

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

This means custom game components automatically appear in the editor's "Add Component" menu and inspector panel — no manual registration needed.

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
- The editor never touches GPU APIs — rendering happens in the game process
- Play mode launches the game in a separate window
