# Shader API

## ShaderManager

Game-facing service available as `$engine->shaders` or via the `Shader` facade.

### Methods

| Method | Returns | Description |
|---|---|---|
| `register(id, definition)` | `void` | Register or override a shader |
| `has(id)` | `bool` | Check if a shader is registered |
| `get(id)` | `?ShaderDefinition` | Get a shader definition |
| `available()` | `string[]` | List all registered shader IDs |
| `use(shaderId)` | `void` | Activate global shader override |
| `reset()` | `void` | Reset to material-driven selection |
| `active()` | `?string` | Current override ID, or null |
| `isOverridden()` | `bool` | Whether a global override is active |

## ShaderDefinition

Readonly value object describing a shader program:

```php
use PHPolygon\Rendering\ShaderDefinition;

$def = new ShaderDefinition(
    vertexPath: 'resources/shaders/source/toon.vert.glsl',
    fragmentPath: 'resources/shaders/source/toon.frag.glsl',
);
```

## ShaderRegistry

Static registry mapping shader IDs to definitions. Used internally by the renderer; prefer `ShaderManager` / `Shader` facade for game code.

```php
use PHPolygon\Rendering\ShaderRegistry;

ShaderRegistry::register('id', $definition);
ShaderRegistry::get('id');      // ?ShaderDefinition
ShaderRegistry::has('id');      // bool
ShaderRegistry::ids();          // string[]
ShaderRegistry::clear();
```

## Built-in Shaders

Registered automatically when the 3D renderer is constructed:

| ID | Vertex | Fragment | Purpose |
|---|---|---|---|
| `default` | `mesh3d.vert.glsl` | `mesh3d.frag.glsl` | Full PBR with 10 procedural modes |
| `unlit` | `unlit.vert.glsl` | `unlit.frag.glsl` | Albedo + fog, no lighting |
| `normals` | `normals.vert.glsl` | `normals.frag.glsl` | Normal visualization |
| `depth` | `depth.vert.glsl` | `depth.frag.glsl` | Depth buffer visualization |
| `skybox` | `skybox.vert.glsl` | `skybox.frag.glsl` | Cubemap skybox |

## Material Shader Property

```php
use PHPolygon\Rendering\Material;

$mat = new Material(
    albedo: new Color(1.0, 0.0, 0.0),
    shader: 'unlit',  // defaults to 'default'
);
```

## Shader Resolution Priority

1. `SetShader` command override (via `Shader::use()`)
2. `Material::$shader` property
3. `'default'` fallback
