# Shaders

PHPolygon provides a complete shader management system. Games can register custom shaders, assign them per material, or override globally for performance testing.

## Using the Shader Facade

```php
use PHPolygon\Support\Facades\Shader;

// List all available shaders
Shader::available();  // ['default', 'unlit', 'normals', 'depth', 'skybox']

// Override globally (all draws use this shader)
Shader::use('unlit');

// Check current state
Shader::active();        // 'unlit'
Shader::isOverridden();  // true

// Reset to material-driven selection
Shader::reset();
```

## Built-in Shaders

| Shader ID | Purpose |
|---|---|
| `default` | Full PBR: lighting, shadows, fog, 10 procedural material modes |
| `unlit` | Albedo + emission + fog only, no lighting (performance baseline) |
| `normals` | Debug: visualize surface normals as RGB colors |
| `depth` | Debug: visualize depth buffer (white = near, black = far) |
| `skybox` | Cubemap skybox (used internally by `SetSkybox` command) |

## Per-Material Shader Assignment

Each material can specify which shader to use:

```php
use PHPolygon\Rendering\Material;
use PHPolygon\Rendering\MaterialRegistry;
use PHPolygon\Rendering\Color;

// This material renders without lighting
MaterialRegistry::register('debug_flat', new Material(
    albedo: new Color(1.0, 0.0, 1.0),
    shader: 'unlit',
));

// Default PBR shader (explicit, same as omitting)
MaterialRegistry::register('stone', new Material(
    albedo: new Color(0.5, 0.5, 0.5),
    roughness: 0.9,
    shader: 'default',
));
```

## Shader Priority

When rendering a mesh, the shader is resolved in this order:

1. **`SetShader` override**  - global frame-level override (via `Shader::use()`)
2. **`Material::$shader`**  - per-material shader assignment
3. **`'default'`**  - fallback PBR shader

## Registering Custom Shaders

```php
use PHPolygon\Rendering\ShaderDefinition;
use PHPolygon\Support\Facades\Shader;

Shader::register('toon', new ShaderDefinition(
    'resources/shaders/source/toon.vert.glsl',
    'resources/shaders/source/toon.frag.glsl',
));
```

Custom shaders are compiled lazily on first use and cached for the session. Unknown shader IDs fall back to `'default'`.

## Writing Custom Shaders

Shaders are written in GLSL 4.10. The same GLSL source is used across all backends:

| Backend | Shader pipeline |
|---|---|
| **OpenGL 4.1** | GLSL loaded and compiled at runtime via `glCreateShader` |
| **Metal (macOS)** | GLSL cross-compiled to Metal Shading Language via MoltenVK/SPIRV-Cross |
| **Vulkan** | GLSL compiled to SPIR-V at build time via `glslangValidator` |

Custom shaders must use the same vertex attribute layout as built-in shaders:

### Required Vertex Attributes

```glsl
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

// Per-instance model matrix (for GPU instancing)
layout(location = 3) in vec4 a_instance_model_col0;
layout(location = 4) in vec4 a_instance_model_col1;
layout(location = 5) in vec4 a_instance_model_col2;
layout(location = 6) in vec4 a_instance_model_col3;
```

### Minimum Required Uniforms

```glsl
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform int  u_use_instancing;  // 0 = u_model, 1 = per-instance attributes
```

Any additional uniforms from the default shader (`u_albedo`, `u_time`, `u_fog_color`, etc.) are set automatically but silently ignored if the shader doesn't declare them.

### Example: Minimal Unlit Shader

**Vertex (`unlit.vert.glsl`):**
```glsl
#version 410 core

layout(location = 0) in vec3 a_position;
layout(location = 3) in vec4 a_instance_model_col0;
layout(location = 4) in vec4 a_instance_model_col1;
layout(location = 5) in vec4 a_instance_model_col2;
layout(location = 6) in vec4 a_instance_model_col3;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform int  u_use_instancing;

void main() {
    mat4 model = u_use_instancing == 1
        ? mat4(a_instance_model_col0, a_instance_model_col1,
               a_instance_model_col2, a_instance_model_col3)
        : u_model;
    gl_Position = u_projection * u_view * model * vec4(a_position, 1.0);
}
```

**Fragment (`unlit.frag.glsl`):**
```glsl
#version 410 core

uniform vec3 u_albedo;
uniform float u_alpha;

out vec4 frag_color;

void main() {
    frag_color = vec4(u_albedo, u_alpha);
}
```

## Overriding Built-in Shaders

Register a shader with a built-in ID **before** the renderer is constructed:

```php
// Replace the default PBR shader entirely
ShaderRegistry::register('default', new ShaderDefinition(
    'resources/shaders/source/my_pbr.vert.glsl',
    'resources/shaders/source/my_pbr.frag.glsl',
));

// Now construct the engine  - it will use your shader as 'default'
$engine = new Engine(new EngineConfig(is3D: true));
```

## Performance Testing

The shader system was designed with performance testing in mind:

```php
// Baseline: render everything with the unlit shader
Shader::use('unlit');

// Measure frame time...
$baselineMs = $clock->frameDeltaMs();

// Switch back to full PBR
Shader::reset();

// Measure again
$pbrMs = $clock->frameDeltaMs();

// The difference is your lighting/shadow cost
```
