# Render Commands

All render commands are readonly PHP value objects in `PHPolygon\Rendering\Command`. They are appended to a `RenderCommandList` during the scene tick and executed by the active backend.

## Commands

### SetCamera

```php
new SetCamera(
    viewMatrix: Mat4,
    projectionMatrix: Mat4,
)
```

### SetAmbientLight

```php
new SetAmbientLight(
    color: Color,
    intensity: float,
)
```

### SetDirectionalLight

```php
new SetDirectionalLight(
    direction: Vec3,
    color: Color,
    intensity: float,
)
```

Up to 16 directional lights per frame.

### AddPointLight

```php
new AddPointLight(
    position: Vec3,
    color: Color,
    intensity: float,
    radius: float,
)
```

Up to 8 point lights per frame.

### DrawMesh

```php
new DrawMesh(
    meshId: string,
    materialId: string,
    modelMatrix: Mat4,
)
```

### DrawMeshInstanced

```php
new DrawMeshInstanced(
    meshId: string,
    materialId: string,
    matrices: Mat4[],
    isStatic: bool = false,  // cache matrix buffer across frames
)
```

### SetSkybox

```php
new SetSkybox(
    cubemapId: string,
)
```

### SetFog

```php
new SetFog(
    color: Color,
    near: float,
    far: float,
)
```

### SetShader

```php
new SetShader(
    shaderId: ?string,  // null = reset to material-driven
)
```

Override the active shader for all subsequent draw commands this frame. Pass `null` to reset. Prefer using the `Shader` facade instead of emitting this command directly.

### SetWaveAnimation

```php
new SetWaveAnimation(
    enabled: bool,
    amplitude: float,
    frequency: float,
    phase: float,
)
```

### SetSkyColors

```php
new SetSkyColors(
    skyColor: Color,
    horizonColor: Color,
)
```

### SetEnvironmentMap

```php
new SetEnvironmentMap(
    textureId: int,  // GL texture handle
)
```

## RenderCommandList

```php
$list = new RenderCommandList();
$list->add(new DrawMesh('box', 'stone', Mat4::identity()));
$list->count();                          // 1
$list->isEmpty();                        // false
$list->ofType(DrawMesh::class);          // [DrawMesh]
$list->getCommands();                    // [DrawMesh]
$list->clear();
```
