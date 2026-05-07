# Performance Profiling

PHPolygon ships with a layered profiling setup tailored for game-engine workloads. Most engine work is CPU-bound on the PHP side, so the tools focus on PHP frame time and ECS hot paths rather than GPU profiling.

## Tools Overview

| Tool | Purpose | Activation |
|---|---|---|
| **SPX** | Deep-dive flamegraphs during a dev session | `SPX_ENABLED=1` env var |
| **Excimer** | Low-overhead sampling profiler for CI / long runs | `PHPOLYGON_EXCIMER=1` env var |
| **PHPBench** | Micro-benchmarks for hot leaf functions (Mat4, Quaternion) | `vendor/bin/phpbench` |
| **Custom benchmark runner** | Frame-loop scenarios over the full Engine | `php benchmarks/run.php <scenario>` |
| **F3 dev overlay** | Live FPS, frame time, GC, top sections | `EngineConfig::$devMode` + F3 |

SPX and Excimer are PHP C-extensions and cannot be installed via Composer. Use the bundled installer:

```bash
./scripts/install-profilers.sh           # both
./scripts/install-profilers.sh spx       # only SPX
./scripts/install-profilers.sh excimer   # only Excimer
php -m | grep -E 'spx|excimer'           # verify
```

PHPBench is a regular dev dependency installed by `composer install`.

## PerfProfiler

`PHPolygon\Runtime\PerfProfiler` is the engine-wide profiling facade. When no profiler extension is loaded, every call collapses to a single bool check (~36µs per 50 markers — 0.2% of a 16.7ms frame budget).

```php
use PHPolygon\Runtime\PerfProfiler;

PerfProfiler::section('mesh.generate.box', fn() => BoxMesh::generate(1, 1, 1));

PerfProfiler::begin('render3d.flush');
$this->renderer3d->endFrame();
PerfProfiler::end();
```

The engine ships with markers around every cross-system hot path. Section names use dot notation:

| Name | Where |
|---|---|
| `engine.update` | Each update tick (may fire N times per frame at fixed dt) |
| `engine.render` | Each visible frame's render body |
| `ecs.update` | `World::update()` |
| `ecs.system.<ClassShortName>` | Per-System loop in `World::update()` |
| `render3d.build_commands` | `Renderer3DSystem::render()` |
| `render3d.flush` | Backend `endFrame()` |
| `mesh.generate.<id>` | Procedural mesh generators |
| `physics.tick` | `Physics3DSystem::update()` |

Add new markers around any cross-system or per-frame work that you expect to be hot. Do **not** instrument tight inner loops (per-vertex, per-pixel) — the marker overhead distorts the measurement.

## F3 Dev Overlay

Set `devMode: true` on `EngineConfig` to enable an in-game overlay:

```php
$engine = new Engine(new EngineConfig(devMode: true));
```

Press **F3** in-game to toggle. Shows:

- FPS (rolling mean over the last 120 frames)
- Latest frame time in ms
- p95 frame time
- GC delta per frame (runs / collected)
- Top 8 `PerfProfiler` sections by total time

The overlay is dev-only. Keep `devMode` off in shipping builds.

## SPX Flamegraphs

Activate per run with an env var:

```bash
SPX_ENABLED=1 SPX_REPORT=full php examples/vio_3d_scene.php
```

To browse interactively:

```bash
SPX_UI_URI=/_spx php -S 127.0.0.1:8080 examples/vio_3d_scene.php
# then open http://127.0.0.1:8080/?SPX_KEY=phpolygon-dev&SPX_UI_LIST=1
```

Useful env vars:

| Variable | Purpose |
|---|---|
| `SPX_ENABLED=1` | Activate profiler |
| `SPX_REPORT=full` | Full call tree (vs flat) |
| `SPX_SAMPLING_PERIOD_US` | Sample period in microseconds (default 100) |
| `SPX_BUILTINS=1` | Include internal functions in the trace |

In a flamegraph, the X axis is time spent and the Y axis is the call stack. Wide stacks at the bottom are hot paths. Common engine wins come from reducing array allocation in tight loops, caching matrix work, or short-circuiting Renderer3DSystem culling.

## Benchmarks

Six headless scenarios drive the engine through reproducible workloads:

```bash
php benchmarks/run.php empty-scene             # baseline (engine overhead only)
php benchmarks/run.php boxes-1000              # 1000 DrawMesh per frame
php benchmarks/run.php boxes-1000-instanced    # same count, one DrawMeshInstanced
php benchmarks/run.php mixed-scene             # ground plane + 200 mixed primitives + 16 lights
php benchmarks/run.php mesh-gen-stress         # 30 mesh generations per frame
php benchmarks/run.php physics-stack           # 100 character controllers in free fall

php benchmarks/run.php list                    # show all scenarios
```

Results are JSON files under `benchmarks/results/<scenario>-<sha>.json` containing p50 / p95 / p99 frame times per `PerfProfiler` section, plus a per-scenario GC histogram.

### Comparing Runs

```bash
# Compare the latest two results for a scenario
php bin/phpolygon perf:report boxes-1000

# Compare two specific shas
php bin/phpolygon perf:report boxes-1000 abc123 def456

# Compare latest result against the committed baseline
php bin/phpolygon perf:report boxes-1000 --baseline
```

Exit code 2 indicates a regression > 15% (configurable via `--threshold`).

### Baselines

`benchmarks/baselines/<scenario>.json` files are checked into git. They serve as the "expected performance on the maintainer's reference hardware" reference point and as the comparison target for `--baseline` mode.

Update baselines deliberately when:

- A behavioural change unavoidably slows a path (e.g. correctness fix that adds a check)
- A new feature increases the floor cost
- An optimization wins enough that the old baseline is now noise

```bash
php benchmarks/run.php <scenario> --warmup 60 --frames 600 --accept
```

CI does **not** use the committed baselines as the regression reference because runner hardware differs from local hardware. Instead, CI runs each scenario twice on the same runner — once on PR HEAD and once on `main` — and diffs the two. This gives stable relative deltas.

### PHPBench Micro-Benchmarks

For hot leaf functions — `Mat4`, `Quaternion`, mesh generators — PHPBench provides per-method statistics (mean, mode, standard deviation) over many revolutions:

```bash
vendor/bin/phpbench run benchmarks/micro/Math --report=aggregate
```

Use PHPBench when the question is "did this specific function get faster" and the custom runner when the question is "did the whole frame get faster".

## Optimization Loop

A repeatable workflow when you suspect or observe a performance issue:

1. **Reproduce locally.** Run the scenario a few times to confirm the regression is real, not measurement noise.
2. **Find the hot spot.** Re-run with `SPX_ENABLED=1` to get a flamegraph. Look for unexpectedly wide stacks.
3. **Snapshot the current state.** `php benchmarks/run.php <scenario> --accept` writes a baseline you can diff against.
4. **Implement the fix on a branch.** Keep changes focused — one optimization at a time so the PR has a clean story.
5. **Diff before / after.** `php bin/phpolygon perf:report <scenario> --baseline`. Aim for a clearly negative delta on p95.
6. **Update the baseline if the win is real.** Re-run with `--accept` and commit the new baseline alongside the code change. Both belong in the same PR.

## CI

`.github/workflows/perf-bench.yml` runs all six scenarios on every PR that touches `src/`, `benchmarks/`, or `composer.{json,lock}`. It compares PR HEAD against `main` on the same runner and fails the job when any frame-time metric regresses by more than 15%. Result JSON is uploaded as the `perf-results` artifact.

## Anti-Patterns

- **Profiler enabled in production** — SPX and Excimer are dev-only. Never ship a build with them on.
- **Markers in tight inner loops** — per-vertex / per-pixel instrumentation distorts measurements.
- **Benchmarks without warm-up** — the first 30-60 frames are always slower (JIT, class loading, texture upload). The runner discards them by default; do not turn that off.
- **Benchmarks with unseeded random** — procedural worlds need fixed seeds for reproducible numbers.
- **Profiling on battery / under thermal throttle** — pin macOS to High Performance, otherwise numbers are meaningless.
- **Comparing instanced vs non-instanced** runs with different mesh counts — apples to oranges.
