# Building & Distribution

PHPolygon compiles a game project into standalone executables with an embedded PHP runtime
(static-php-cli `micro.sfx` + the game as a PHAR). The CLI entry point is `vendor/bin/phpolygon`.

## Quick Start

```bash
php -d phar.readonly=0 vendor/bin/phpolygon build                 # auto-detect platform
php -d phar.readonly=0 vendor/bin/phpolygon build macos-arm64      # specific target
php -d phar.readonly=0 vendor/bin/phpolygon build all              # every desktop platform
php vendor/bin/phpolygon build --dry-run                           # show the resolved config only
php -d phar.readonly=0 vendor/bin/phpolygon build all --phar /tmp/game.phar   # build the PHAR once
```

### Targets

| Target | Platform |
|---|---|
| `macos-arm64`, `macos-x86_64` | macOS Apple Silicon / Intel (`.app` bundle) |
| `linux-x86_64`, `linux-arm64` | Linux (flat directory) |
| `windows-x86_64` | Windows (`.exe` + DLLs) |
| `ios-arm64`, `ios-simulator-arm64`, `ios-simulator-x86_64` | iOS / iPadOS (needs Xcode and an embed build of PHP) |
| `macos`, `linux`, `windows` | all architectures of that platform |
| `ios` | shorthand for `ios-arm64` |
| `all` | every desktop platform (iOS excluded) |
| _(empty)_ | the current platform |

### Options

| Option | Meaning |
|---|---|
| `--dry-run` | Show the resolved configuration without building |
| `--micro-sfx PATH` | Use this pre-built `micro.sfx` runtime |
| `--phar PATH` | Cross-target PHAR cache: the first target builds the PHAR at `PATH`, every later target reuses it (skips vendor, stage and PHAR) |
| `--derive-phar PATH` | With `--phar`: make a missing `--phar` from this PHAR of another build type (see [Build Types](#build-types)) |
| `-o`, `--output DIR` | Output directory (default `build/`) |
| `--variant NAME` | Runtime variant: `base` or `steam` (default `base`) |
| `--type NAME` | Build type from `build.json` (default `full`) |
| `--php-version VER` | Runtime PHP version: `8.4` or `8.5` (default `8.5`) |
| `--release` | iOS only: Release `.xcarchive` (App Store) |
| `--ipa` | iOS only: export an App Store Connect `.ipa` (implies `--release`) |

### Other commands

| Command | Purpose |
|---|---|
| `phpolygon verify-build [path] [--type T]` | Check finished packages against `build.json` (see [Verification](#verification)) |
| `phpolygon build:transpile [--check]` | Transpile `resources/ui/*.ui.json` into PHP builder classes; `--check` fails when they are out of sync |
| `phpolygon speech:setup` / `speech:status` / `speech:sync` | Offline speech synthesis (see [Speech Synthesis](/guide/speech)) |
| `phpolygon scene:transpile <file.scene.json>` | Scene JSON back to canonical PHP Scene source |
| `phpolygon editor` | Launch the scene editor |
| `phpolygon perf:report <scenario>` | Compare two benchmark results |

## Build Pipeline

1. **Vendor** - `composer install --no-dev --optimize-autoloader --no-scripts` in a working copy
   of `composer.json` / `composer.lock` inside the build's temp directory. The project's own
   `vendor/` and lock file are only read, so parallel or failed builds never touch the dev
   install; a failing Composer fails the build. `PHPOLYGON_COMPOSER` overrides the Composer command.
2. **Stage** - copy `src/`, the production `vendor/`, `assets/` and `resources/` into the temp
   directory (symlinks resolved, `resources.external` and `resources.exclude` left out), then
   apply build-type constants, transpile UI layouts and, with `assets.meshes: "binary"`, compile
   mesh assets.
3. **PHAR** - `game.phar` with a custom stub (micro SAPI detection, macOS bundle paths, start-up
   extraction, engine bootstrap) and a build id (hash of the staged `assets/` + `resources/`).
4. **micro.sfx** - resolve the static PHP runtime: explicit path, then the cache in
   `~/.phpolygon/build-cache/`, then a download from the runtime releases. On Windows the
   resolver also fetches the runtime libraries (Vulkan loader, `d3dcompiler_47`, DXC for Shader
   Model 6, Steam API for the `steam` variant).
5. **Combine** - `micro.sfx` + embedded ini section + `game.phar` into one executable (macOS:
   `micro.sfx` + a small launcher, see [macOS bundle layout](#macos-bundle-layout)).
6. **Package** - macOS `.app` bundle with `Info.plist`, Linux/Windows flat directory, then
   `hooks.afterPackage` and the [verification](#verification) of the artifact.
7. **Report** - PHAR size, binary size, bundle size.

Phases 1-3 are identical for every desktop target of the same variant and build type. With
`--phar PATH` they run once; every later target only runs phases 4-7.

If the project defines `speech` in `build.json`, the [speech sync](/guide/speech) runs before
the targets.

## Configuration

`build.json` in the project root (optional - without it the build falls back to
`composer.json`):

```json
{
  "name": "MyGame",
  "identifier": "com.studio.mygame",
  "version": "1.0.0",
  "entry": "game.php",
  "run": "\\App\\Game::start();",
  "php": {
    "extensions": ["mbstring", "zip", "phar"],
    "ini": { "opcache.enable_cli": "1", "opcache.jit": "tracing", "opcache.jit_buffer_size": "128M" }
  },
  "phar": { "exclude": ["**/tests", "**/docs"], "compression": "gzip" },
  "assets": { "meshes": "binary", "meshZlib": 6 },
  "resources": {
    "external": ["assets/audio", "resources/video"],
    "exclude": ["assets/audio/raw-takes", "assets/**/*.wav"]
  },
  "buildTypes": {
    "demo": { "constants": { "DEMO_MODE": true } }
  },
  "verify": { "versionConstant": "GAME_VERSION", "files": { "*": ["resources/keys/api-token"] } },
  "hooks": { "beforeBuild": [ { "run": ["@php", "tools/prebake.php"] } ] },
  "platforms": {
    "macos": { "icon": "icon.icns", "minimumVersion": "12.0" }
  }
}
```

### Reference

| Key | Meaning |
|---|---|
| `name`, `identifier`, `version` | Bundle name, reverse-DNS id (used for cache and save directories), version |
| `entry`, `run` | Bootstrap file and the PHP statement that starts the game |
| `php.extensions` | Extensions the runtime must provide |
| `php.ini` | Startup ini settings embedded into the executable (see [Embedded php.ini](#embedded-php-ini)) |
| `php.threading` | `true` = ZTS runtime + `parallel` for multithreading |
| `php.bundleLibs` | Platform-specific native libraries copied next to the binary |
| `phar.exclude` | Extra per-segment patterns for the staged `vendor/` (added to the defaults: tests, docs, examples, benchmarks, `*.log`, ...) |
| `phar.additionalRequires` | Further bootstrap files; build-type constants are rewritten there too |
| `phar.compression` | `"gzip"` (default) or `"none"` |
| `ui.transpile` | `dir` (default `resources/ui`), `output`, `namespace` for the UI layout transpiler |
| `assets.meshes` | `"json"` (default) or `"binary"`: compile every staged `*.mesh.json` into `*.mesh.bin` |
| `assets.meshZlib` | zlib level 0-9 for `.mesh.bin` (default 6) |
| `resources.external` | Paths that ship loose next to the executable, never in the PHAR |
| `resources.exclude` | Glob patterns that ship nowhere |
| `resources.trimPython` | Slim an embedded CPython runtime (see [Embedded Python runtimes](#embedded-python-runtimes)) |
| `buildTypes.<type>` | `constants` to rewrite, `sharedPhar` (default `true`) |
| `verify` | `versionConstant`, `files` per build type (`"*"` = every type) |
| `hooks` | `beforeBuild`, `afterPackage` |
| `upscalers` | FSR 3 / DLSS runtimes shipped with the game (see [Native upscaler runtimes](#native-upscaler-runtimes)) |
| `speech` | Offline voice lines (see [Speech Synthesis](/guide/speech)) |
| `platforms.macos` | `icon`, `minimumVersion`, `launcher` (own shell launcher for the universal bundle) |
| `platforms.ios` | iOS bundle settings |

### What ships where

- **`phar.exclude`** filters only the staged `vendor/`; `src/` always ships in full. Development
  files in every package root (dotfiles, `*.md`, `composer.lock`, phpunit/phpstan configs) and
  Composer download leftovers are dropped as well. A package's LICENSE/COPYING/NOTICE always ships.
- **`resources.external`** lists project-relative paths (folders or single files, under any
  root) that ship next to the executable (macOS: `Contents/Resources/`). A bare name without
  `/` (`"shaders"`) means `resources/shaders`. Globs are rejected here. Native loaders that cannot
  read `phar://` (large audio, video, big textures) need their folders external.
- **`resources.exclude`** lists glob patterns (`*` / `?` inside one segment, `**` across
  segments, `[...]` classes; a matching folder covers everything below it) that ship
  **nowhere** - neither in the PHAR nor among the external files. For raw sources and tool
  inputs inside a shipped folder (recording takes, `.psd` files). It applies to every way a file
  ships: PHAR staging, compiled meshes, the external copy and the iOS bundle.
- Both lists are validated on load: relative paths only, no `..`, no absolute or drive paths.
- **`phar.compression: "gzip"`** compresses every entry; asset-heavy archives shrink to roughly a
  sixth while start-up costs the same. Build PHP and runtime both need `ext-zlib` - the stub
  refuses to start without it and says so in `game.log`. The engine's runtimes carry zlib; for any
  other runtime set `"none"`.

## Embedded php.ini

The combined executable ignores `php.ini` files, and startup-only settings (OPcache and its JIT)
cannot be changed with `ini_set()`. `php.ini` in `build.json` embeds them: the builder writes the
ini section that static-php-cli's `micro:combine -I` would write between `micro.sfx` and the PHAR.
No runtime rebuild is needed; OPcache is compiled into the PHP 8.5 runtimes.

```json
"php": { "ini": { "opcache.enable_cli": "1", "opcache.jit": "tracing", "opcache.jit_buffer_size": "128M" } }
```

Once OPcache is on, the engine forces `opcache.validate_timestamps=0` and
`opcache.file_update_protection=0`, whatever `build.json` says: the embedded script has no file
behind it, and the timestamp check crashed the runtime before the first line on macOS. The
script never changes, so the check is useless on every platform.

## Build Hooks

`hooks.beforeBuild` lists commands that run in the project root before the game is staged (asset
pre-bakes, generated data). They run once per build that creates a PHAR; `--phar` reuse targets
skip them. A failing hook fails the build; `PHPOLYGON_SKIP_HOOKS=1` skips all hooks.

`hooks.afterPackage` (same form) runs **per target**, also on `--phar` reuse, once the bundle is
assembled. `PHPOLYGON_BUILD_OUTPUT` is the `.app` or flat directory, `PHPOLYGON_BUILD_RESOURCES`
the place of the external resources. Use it for per-target files (platform runtimes) and checks
before an upload.

```json
"hooks": { "beforeBuild": [
  { "run": ["@php", "-d", "memory_limit=-1", "tools/prebake.php"], "requires": ["imagettftext"], "runtimeVariant": "steam" }
] }
```

- `@php` resolves to `PHPOLYGON_HOOK_PHP`, else the PHP running the build when it has every
  function in `requires`, else the game's own static runtime (variant `runtimeVariant`) wrapped
  as a runner with its libraries next to it - so a hook can use the shipped game's extensions
  inside a build container whose PHP lacks them.
- Hooks see `PHPOLYGON_BUILD_PLATFORM`, `_ARCH`, `_VARIANT` and `_TYPE`. `PHPOLYGON_HOOK_PHP` names
  the interpreter of an `@php` hook: start further PHP processes with it, because `PHP_BINARY` is
  empty inside a micro runtime.
- The runner embeds a startup ini (OPcache on, tracing JIT, 128M buffer) overridden by
  `build.json` `php.ini`, so hooks and the workers they start run with JIT. Its `-d` options are
  `ini_set()` calls; a startup-only key prints `runner: <key> is fixed at startup, keeping ...`.
- php-vio starts its window platform when it loads, before any PHP code runs. On a Linux host
  with neither `DISPLAY` nor `WAYLAND_DISPLAY` (a build container) hooks therefore run with
  `VIO_PLATFORM=null` unless you set `VIO_PLATFORM` yourself, and the workers they start inherit
  it: no GLFW warnings (`error 65544 ... DISPLAY ... missing`) at start-up. The null platform has
  no windows and no OpenGL context; `vio_audio_encode` and `vio_text_bitmap` work. Windows and
  macOS hooks keep the native platform. (Since v0.68.1; earlier versions print the two warnings,
  which are harmless.)

## Build Types

`buildTypes.<type>.constants` are written into the staged bootstrap files - `bootstrap.php` and
every file of `phar.additionalRequires`, wherever one has `define('NAME', ...)`. A constant that
none of them defines fails the build.

**One PHAR for every build type.** Types differ only in their constants, so
`phpolygon build --phar NEW --derive-phar BUILT` makes a missing `NEW` from a PHAR already built
for another type: copy, rewrite the bootstrap files with the type's values (and the project's
values for everything else). No hooks, no production install, no staging - about two seconds
instead of a full PHAR build. A type whose hooks produce type-specific files sets
`"sharedPhar": false` and is built from scratch.

## Verification

Every `phpolygon build` checks its artifact (also for a reused `--phar`). A problem fails the
target; `PHPOLYGON_SKIP_VERIFY=1` turns it into a warning.

- Each constant any build type sets resolves, inside the PHAR, to the requested type's value;
  constants the type leaves alone keep the project's value (a full build never carries a demo
  flag). Only `define()` calls are read; the first one in require order wins.
- `verify.versionConstant` equals `build.json` `version`.
- Every path of `verify.files` (`"*"` plus the type) ships non-empty, in the PHAR or among the
  external resources - for git-ignored files that a fresh checkout silently lacks.

`phpolygon verify-build [path] [--type T]` checks finished packages: a `.phar`, a macOS `.app`, a
package directory or a combined binary. Without a path it checks every `build/<platform>-<arch>*`
directory and takes the type from the directory name.

```bash
vendor/bin/phpolygon verify-build
vendor/bin/phpolygon verify-build build/linux-x86_64-steam-demo --type demo
```

## Output Structure

```
build/
├── macos-arm64-steam/MyGame.app/
│   └── Contents/
│       ├── MacOS/MyGame              ← micro.sfx (signed) + php.ini section + launcher
│       ├── Resources/mygame.phar     ← the game PHAR
│       ├── Resources/assets|resources|<external>   ← pre-extracted + external files
│       └── Info.plist
├── linux-x86_64-steam/MyGame/        ← ELF + .so
└── windows-x86_64-steam/MyGame/      ← .exe + DLLs
```

Package directories are named `<platform>-<arch>-<variant>[-<type>]`.

### Start-up extraction

Native loaders cannot read `phar://`, so the stub copies the PHAR's `assets/` and `resources/` to
disk - **once per build id**, not per start. Every file lands as a temporary file and is renamed
into place; a marker (`.phpolygon-extracted.json`) is written last, so an aborted start simply
extracts again.

- Writable install directory (Windows/Linux, Steam library): in place next to the executable.
- Signed macOS `.app` or read-only install: the build pre-extracts into the bundle, so nothing is
  written at start; otherwise the user cache (`~/Library/Caches/<identifier>`,
  `%LOCALAPPDATA%\<identifier>`, `$XDG_CACHE_HOME/<identifier>`) with the external entries linked in.

### macOS bundle layout

The macOS binaries carry only a small launcher; the PHAR is `Contents/Resources/<name>.phar`. A
universal bundle therefore shares one PHAR between an arm64 and an x86_64 binary, and a shell
launcher (or the game's own, `platforms.macos.launcher`) picks the architecture Rosetta-safe.
Inside a `.app` the game never writes to the bundle: logs go to `~/Library/Logs/<name>/`
(`boot.log`, `game.log`, `launch.log`, each rotated once per start), saves and mods to
`~/Library/Application Support/<identifier>/`.

The bare `micro.sfx` is ad-hoc signed **before** the launcher is appended (JIT and library
entitlements; `MAC_HARDENED=1` adds the hardened runtime). Signing a finished binary would
rewrite the Mach-O and cut off the appended payload.

## PHAR Stub Constants

Defined at runtime inside the built game:

| Constant | Purpose |
|---|---|
| `PHPOLYGON_PATH_ROOT` | Resource base directory (macOS: `Contents/Resources`) |
| `PHPOLYGON_PATH_ASSETS` | Extracted assets |
| `PHPOLYGON_PATH_RESOURCES` | Extracted resources (shaders, fonts) |
| `PHPOLYGON_PATH_SAVES` | User save data |
| `PHPOLYGON_PATH_MODS` | Mod directory |
| `PHPOLYGON_PATH_LOGS` | Log directory (`game.log`; `Engine::log()` follows it) |

Outside a macOS bundle all of them point next to the executable. A built PHAR also runs with
`php game.phar`.

## Native upscaler runtimes

`upscalers` ships FSR 3 / DLSS runtimes next to the binary:

```json
"upscalers": {
  "fsr": true,
  "dlss": { "plugin": "github:<owner>/<private-repo>@<tag>", "projectId": "<random GUID>" }
}
```

- `fsr: true` fetches the signed FidelityFX runtime DLLs (MIT) for a pinned SDK tag, SHA-256
  checked and cached in `~/.phpolygon/build-cache/upscalers/`. A folder path uses local files.
  Windows only, unless the folder has the Vulkan `.so`.
- `dlss.plugin` is a folder with the DLSS plugin and NVIDIA runtime, or a release of a **private**
  repository (`GITHUB_TOKEN` / `GH_TOKEN` / `gh auth token`; public repositories are refused).
  Never macOS.
- `dlss.projectId` becomes the embedded ini `vio.dlss_project_id`; `EngineConfig::$dlssProjectId`
  overrides it at runtime.
- Anything missing is a warning; the game builds without that upscaler.
- `THIRD-PARTY-NOTICES.txt` lands next to the binary (AMD MIT notice; NVIDIA notices for DLSS).
- Licence duties stay with the game: NVIDIA attribution in splash or credits, notifying NVIDIA
  before a commercial release, EULA terms. NVIDIA files travel only inside the game.

## Embedded Python runtimes

A game that ships a CPython runtime (python-build-standalone) can slim it, either from code
(`PHPolygon\Build\PythonRuntimeTrimmer::trim()`) or declaratively for external resources:

```json
"resources": { "external": ["runtimes"],
  "trimPython": [ { "path": "runtimes/*/python", "groups": ["default", "network"], "remove": [], "keep": [] } ] }
```

`default` removes tooling (pip, venv), GUI modules (tkinter, Tcl/Tk), stdlib tests, headers and
optimised bytecode variants - nothing a script run imports. Opt-in groups: `network` (OpenSSL),
`sqlite`, `docs`. Patterns are case-sensitive, `keep` wins.

## Environment Variables

| Variable | Effect |
|---|---|
| `PHPOLYGON_COMPOSER` | Composer command for the production install |
| `PHPOLYGON_SKIP_HOOKS=1` | Skip all build hooks |
| `PHPOLYGON_SKIP_VERIFY=1` | Verification problems become warnings |
| `PHPOLYGON_HOOK_PHP` | Interpreter for `@php` hooks (also set for the hook itself) |
| `PHPOLYGON_BUILD_PLATFORM`, `_ARCH`, `_VARIANT`, `_TYPE` | Set for hooks: the current target |
| `PHPOLYGON_BUILD_OUTPUT`, `PHPOLYGON_BUILD_RESOURCES` | Set for `afterPackage`: bundle and external-resources directory |
| `PHPOLYGON_SPEECH=generate\|check\|off` | Override `speech.build` (see [Speech Synthesis](/guide/speech)) |

## Cross-platform builds in Docker

The engine repository ships a game-agnostic Docker harness (`docker/`) that builds
**windows-x86_64, linux-x86_64, macos-arm64 and macos-x86_64** from one Linux container - no Mac
needed. The game is bind-mounted at `/app`; name, version and build types come from its
`build.json`. macOS binaries are ad-hoc signed with `rcodesign` (runtime first, then the PHAR is
appended); notarization is skipped, the Steam depot is marked as not notarized.

```bash
# from the engine repository root
docker build -f docker/Dockerfile.build -t phpolygon-build docker

# from the game directory
docker run --rm --platform linux/amd64 \
  -e GITHUB_TOKEN="$(gh auth token)" \
  -v "$PWD:/app" -v phpolygon-buildcache:/root/.phpolygon \
  phpolygon-build
```

A GitHub token is required (any valid token): Composer and the runtime download hit the GitHub
API, which is rate-limited anonymously on shared Docker egress IPs. Add `-it` for an interactive
menu (version, platforms, build type, signing); the chosen version is written into `build.json`
and the game's version constant file.

The harness builds the PHAR once and reuses it for every target (`--phar`), derives further
build types from it (`--derive-phar`) and verifies every built target before an upload.

| Variable | Default | Meaning |
|---|---|---|
| `VERSION` | _(keep)_ | Version to stamp into `build.json` and the version constant file |
| `PLATFORMS` | `all` | Subset of `windows-x86_64 linux-x86_64 macos-arm64 macos-x86_64` |
| `TYPE` | `full` | A build type from `build.json`, or `all-types` |
| `VARIANT` | `steam` | Runtime variant |
| `SIGN_MAC` | `1` | Ad-hoc sign the macOS runtime |
| `PHP_VERSION` | `8.5` | Runtime PHP version |
| `INTERACTIVE` / `NONINTERACTIVE` | _(auto)_ | Force the menu / env-driven mode |
| `VERSION_CONST_FILE` / `VERSION_CONST` | _(auto)_ | Version constant file and name |
| `PHPOLYGON_WORKDIR` | _(off)_ | Build in an rsync mirror of `/app` at this path (a mounted volume) |
| `PHPOLYGON_SYNC_EXCLUDE` | _(none)_ | rsync patterns the mirror skips (only what no build step reads) |
| `PHPOLYGON_COPY_OUT` | _(none)_ | With `PHPOLYGON_WORKDIR`: `all` or package directory names copied back to `/app/build` |
| `UPLOAD` | _(none)_ | Steam upload targets from `steam-build.json` (see below) |
| `STEAM_DRY_RUN` | `0` | `1` = everything except the actual upload |

### Building in a volume

On Docker Desktop the `/app` bind mount is the bottleneck for large packages. Mount a named volume
and point `PHPOLYGON_WORKDIR` at it: the harness mirrors `/app` into it (first run copies, later
runs only what changed; `build/` and `.git` stay out) and builds there. `build/` then lives in the
volume; set `PHPOLYGON_COPY_OUT` to get packages back.

```bash
docker run --rm --platform linux/amd64 \
  -e GITHUB_TOKEN="$(gh auth token)" -e PHPOLYGON_WORKDIR=/work -e PHPOLYGON_COPY_OUT=all \
  -v "$PWD:/app" -v mygame-work:/work -v phpolygon-buildcache:/root/.phpolygon \
  phpolygon-build
```

### Steam upload

With `UPLOAD=<target>` the harness runs **auth → build → upload**: it logs in to Steam first
(Steam Guard up front, cached in a volume), builds all four desktop targets, assembles the macOS
universal bundle, generates the `app_build` VDF and runs `steamcmd +run_app_build`.

```bash
docker run --rm -it --platform linux/amd64 \
  -e GITHUB_TOKEN="$(gh auth token)" -e UPLOAD="full" \
  -v "$PWD:/app" -v phpolygon-buildcache:/root/.phpolygon -v steam-session:/root/Steam \
  phpolygon-build
```

Upload targets live in `steam-build.json` next to `build.json` (a missing one is prompted for and
saved):

```json
{
  "steamUser": "your-login",
  "uploads": {
    "full": {
      "appId": "1000000",
      "buildType": "full",
      "setLive": "",
      "depots": { "windows-x86_64": "1000001", "linux-x86_64": "1000002", "macos-universal": "1000003" }
    }
  }
}
```

`buildType` picks which `build/<platform>-<suffix>` directories ship, `setLive` names a branch to
set live after the upload (empty = upload only). Before uploading, the harness stages all depots
on the container's filesystem, sets and checks the executable bits, and aborts when a macOS binary
or `.dylib` lacks an architecture slice or a depot holds two paths that differ only in case.

::: warning Verify on a real Mac
The container proves that the macOS bundle is well-formed and signed, not that it runs. Start the
`.app` once on an Apple Silicon Mac before shipping.
:::
