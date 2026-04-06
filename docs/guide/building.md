# Building & Distribution

PHPolygon compiles game projects into standalone executables with an embedded PHP runtime.

## Quick Start

```bash
php -d phar.readonly=0 vendor/bin/phpolygon build                # auto-detect platform
php -d phar.readonly=0 vendor/bin/phpolygon build macos-arm64     # specific target
php -d phar.readonly=0 vendor/bin/phpolygon build all              # all platforms
php vendor/bin/phpolygon build --dry-run                           # show config only
```

## Build Pipeline

The build system runs a 7-phase pipeline:

1. **Vendor** — `composer update --no-dev` (restored after build)
2. **Stage** — copy src/, vendor/, assets/, resources/ into temp dir
3. **PHAR** — create `game.phar` with custom stub
4. **micro.sfx** — resolve static PHP binary (cache or download)
5. **Combine** — concatenate `micro.sfx` + `game.phar` into single executable
6. **Package** — platform-specific: macOS `.app` bundle, Linux/Windows directory
7. **Report** — file sizes and build summary

## Configuration

Create `build.json` in your game project root:

```json
{
  "name": "MyGame",
  "identifier": "com.studio.mygame",
  "version": "1.0.0",
  "entry": "game.php",
  "run": "\\App\\Game::start();",
  "php": { "extensions": ["glfw", "mbstring", "zip", "phar"] },
  "phar": { "exclude": ["**/tests", "**/docs"] },
  "resources": { "external": ["resources/audio"] },
  "platforms": {
    "macos": { "icon": "icon.icns", "minimumVersion": "12.0" }
  }
}
```

## Output Structure

```
build/
├── MyGame.app/           ← macOS bundle
│   └── Contents/
│       ├── MacOS/
│       │   └── MyGame    ← executable (micro.sfx + game.phar)
│       ├── Resources/
│       │   ├── assets/
│       │   ├── resources/
│       │   └── saves/
│       └── Info.plist
├── linux/                ← Linux AppImage
└── windows/              ← Windows directory
```

## PHAR Stub Constants

Available at runtime inside the built game:

| Constant | Purpose |
|---|---|
| `PHPOLYGON_PATH_ROOT` | Resource base directory |
| `PHPOLYGON_PATH_ASSETS` | Extracted assets |
| `PHPOLYGON_PATH_RESOURCES` | Shaders, fonts |
| `PHPOLYGON_PATH_SAVES` | User save data |
| `PHPOLYGON_PATH_MODS` | Mod directory |
