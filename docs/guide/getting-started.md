# Getting Started

## Requirements

- PHP 8.2+
- Composer
- [php-glfw](https://github.com/mario-deluna/php-glfw) extension (for rendering)

## Installation

Create a new game project and require PHPolygon:

```bash
mkdir my-game && cd my-game
composer init
composer require phpolygon/phpolygon
```

## Minimal 2D Game

```php
<?php

use PHPolygon\Engine;
use PHPolygon\EngineConfig;
use PHPolygon\Rendering\Color;

$engine = new Engine(new EngineConfig(
    width: 1280,
    height: 720,
    title: 'My First Game',
));

$engine->onRender(function (Engine $e) {
    $r = $e->renderer2D;
    $r->drawFilledRect(100, 100, 200, 150, Color::blue());
    $r->drawText('Hello PHPolygon!', 120, 160, 24, Color::white());
});

$engine->run();
```

## Minimal 3D Game

```php
<?php

use PHPolygon\Engine;
use PHPolygon\EngineConfig;
use PHPolygon\Component\Transform3D;
use PHPolygon\Component\MeshRenderer;
use PHPolygon\Component\Camera3DComponent;
use PHPolygon\Geometry\BoxMesh;
use PHPolygon\Geometry\MeshRegistry;
use PHPolygon\Math\Vec3;
use PHPolygon\Math\Quaternion;
use PHPolygon\Rendering\Material;
use PHPolygon\Rendering\MaterialRegistry;
use PHPolygon\Rendering\Color;

$engine = new Engine(new EngineConfig(
    width: 1280,
    height: 720,
    title: 'My 3D Game',
    is3D: true,
));

// Register geometry and materials
MeshRegistry::register('box', BoxMesh::generate(1.0, 1.0, 1.0));
MaterialRegistry::register('red', Material::color(Color::red()));

$engine->onInit(function (Engine $e) {
    // Camera
    $cam = $e->world->spawn('Camera');
    $cam->attach(new Transform3D(position: new Vec3(0, 3, 5)));
    $cam->attach(new Camera3DComponent());

    // A red box
    $box = $e->world->spawn('Box');
    $box->attach(new Transform3D(position: new Vec3(0, 0, 0)));
    $box->attach(new MeshRenderer('box', 'red'));
});

$engine->run();
```

## Project Structure

```
my-game/
├── composer.json
├── game.php              ← entry point
├── src/
│   ├── Scene/            ← scene PHP files
│   ├── Component/        ← custom components
│   ├── System/           ← custom systems
│   └── World/            ← procedural geometry
├── assets/               ← sounds, UI layouts
├── resources/
│   └── shaders/source/   ← custom GLSL shaders
└── build.json            ← build configuration (optional)
```

## Using Facades

PHPolygon provides Laravel-style facades for convenient static access:

```php
use PHPolygon\Support\Facades\World;
use PHPolygon\Support\Facades\Input;
use PHPolygon\Support\Facades\Shader;
use PHPolygon\Support\Facades\Events;

// Spawn entities
$entity = World::spawn('Player');

// Check input
if (Input::isKeyPressed(GLFW_KEY_SPACE)) {
    // jump
}

// Switch shaders for performance testing
Shader::use('unlit');
```
