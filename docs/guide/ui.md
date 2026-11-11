# UI System

PHPolygon provides two UI approaches: an immediate-mode `UIContext` for simple in-game interfaces, and a retained-mode widget tree for complex layouts.

## Immediate Mode (UIContext)

```php
use PHPolygon\UI\UIContext;
use PHPolygon\UI\UIStyle;

$ui = new UIContext($renderer, $input, new UIStyle(...));

// In your render callback:
$ui->begin($x, $y, $width);

if ($ui->button('start_btn', 'Start Game', $buttonWidth)) {
    // Button was clicked
}

$volume = $ui->checkbox('mute_cb', 'Mute Sound', $isMuted);
$ui->label('Score: 42,000');
$ui->separator();

$ui->end();
```

### Immediate-Mode Widgets

| Widget | Method | Returns |
|---|---|---|
| Button | `button(id, label, width, disabled?)` | `bool` - true on release |
| Checkbox | `checkbox(id, label, value)` | `bool` - new value |
| Label | `label(text)` | `void` |
| Separator | `separator()` | `void` |

### Layout

`UIContext` uses vertical flow by default. Use `'horizontal'` for row layouts:

```php
$ui->begin($x, $y, $width);              // vertical
$ui->label('Choose:');
$curY = $ui->getCursorY();
$ui->end();

$ui->begin($x, $curY, $width, 'horizontal');
$ui->button('opt_a', 'Option A', $btnW);
$ui->button('opt_b', 'Option B', $btnW);
$ui->end();
```

## Retained Mode (Widget Tree)

For complex UIs, PHPolygon provides a retained-mode widget system with a `WidgetTree` and layout containers.

### Layout Widgets

| Widget | Purpose |
|---|---|
| `HBox` | Horizontal container |
| `VBox` | Vertical container |
| `Stack` | Stacked/layered container |
| `Panel` | Container with border and padding |
| `ScrollView` | Scrollable container |
| `Anchor` | Anchor-based positioning |
| `Spacer` | Empty spacing |
| `Separator` | Visual separator line |

### Input Widgets

| Widget | Purpose |
|---|---|
| `Button` | Clickable button with label and press state |
| `Checkbox` | Checkbox with toggle state |
| `Toggle` | Toggle switch |
| `Slider` | Numeric slider (0.0-1.0) |
| `TextInput` | Text input field |
| `Dropdown` | Dropdown menu selector |

### Display Widgets

| Widget | Purpose |
|---|---|
| `Label` | Text label |
| `Image` | Image display |
| `ProgressBar` | Progress indicator |

### Sizing

Widgets support flexible sizing via `Sizing`:

```php
use PHPolygon\UI\Widget\Sizing;

$button = new Button('Click me');
$button->sizing = new Sizing(fillWidth: true, height: 40);
```

Padding and margins use `EdgeInsets`:

```php
use PHPolygon\UI\Widget\EdgeInsets;

$panel = new Panel();
$panel->padding = new EdgeInsets(left: 10, top: 10, right: 10, bottom: 10);
```

## UISystem

The `UISystem` is an ECS system that manages UI layers and widget rendering. Register it like any other system:

```php
$world->addSystem(new UISystem($renderer, $input));
```

## Wrapping Buttons

`button()` draws one line at style height. For labels that must survive long translations use `wrapButton()`: the label wraps (CJK breaks between characters), the button grows per extra line and nothing is cut. `fitButtonLabels()` finds one shared font size and line count for a row of equal buttons, `layoutButtonRow()` sizes a row to its labels.

## Resolution-Independent Panels

A panel laid out for a 1080-line screen is tiny on 4K. Instead of a magnifying transform (which stretches the glyph atlas), draw it through a scaling pair that shares one `UIScale`:

```php
use PHPolygon\Rendering\ScaledRenderer2D;
use PHPolygon\Runtime\ScaledInput;
use PHPolygon\UI\UIScale;

$scale = new UIScale();
$renderer = new ScaledRenderer2D($engine->renderer2D, $scale);
$input = new ScaledInput($engine->input, $scale);

// per frame, while rendering:
$scale->set(UIScale::forScreen($engine->renderer2D->getHeight(), userFactor: $playerChoice));
[$previousRenderer, $previousInput] = $ui->useBackends($renderer, $input);
try {
    drawPanel($renderer, $ui);   // lay out in logical 1080-line pixels
} finally {
    $ui->useBackends($previousRenderer, $previousInput);
}
```

`ScaledRenderer2D` multiplies every position, size, line width and font size by the factor (text is requested at the larger size, so it stays crisp) and reports logical sizes; `ScaledInput` divides the pointer position. `UIScale::forScreen()` returns `max(1, height / 1080) × userFactor`, snapped to eighths (1440 → 1.375, 2160 → 2).

## Dropdown Overlays

Dropdown option lists are rendered as deferred overlays via `flushOverlays()`.
Call this once at the end of the frame, after all `begin()`/`end()` pairs:

```php
// After all UI rendering
$ui->flushOverlays();
```

This ensures dropdown lists render on top of all other widgets regardless of
draw order. Without it, widgets drawn after the dropdown occlude its option list.

## Text Fields

Text fields support:
- Blinking cursor (1Hz) at the insertion point
- Character insertion at cursor position (not just append)
- Arrow key navigation, backspace at cursor, delete forward

## Text Areas (code editing)

`textArea($id, $value, $rows, $underlay, $indentRules)` edits multi-line text through
`UI\TextEdit\TextEditModel` (pure model: buffer, caret, selection, undo; positions are code points):

- Tab / Shift+Tab (also over a line selection), Enter with auto-indent (`IndentRules`:
  `IndentRules::braces()` or `offside()` per language), smart Home, Ctrl+Home/End
- Shift selection, mouse drag, double-click selects a word, Ctrl word jumps
- Ctrl+A/C/X/V, Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z (a typing run is one undo step)
- macOS: Command for shortcuts, Option for word jumps

Shortcut letters follow the keyboard layout (`VioKeyboardLayout` = php-vio `vio_key_name()`, so
Ctrl+Z hits the Z keycap on QWERTZ too). The clipboard is a `ClipboardInterface`: `VioClipboard`
(system clipboard, php-vio 2.33+) when the input is `VioInput`, otherwise `MemoryClipboard` -
tests never touch the user's clipboard. The returned `TextAreaView` reports `caret` and
`selectionStart` / `selectionEnd`.

## Modal Interaction Gate

`setInteractive(false)` gates the widgets behind a modal overlay: they still render, but hover -
and with it every click - misses. Restore `true` before the modal draws its own widgets.

```php
$ui->setInteractive(false);
drawPanelsBehindModal();   // visible but unresponsive
$ui->setInteractive(true);
drawConfirmDialog();        // own widgets respond again
```

## Rebindable Input Actions

The bindings given to `InputMap::addAction()` are the action's **defaults**; rebinding is built
in. The engine never persists it - the game stores the exported array in its own settings.

```php
$map->addAction('replay', InputBinding::key(71))      // G
    ->reserve(87, 65, 83, 68)                          // keys the game reads directly
    ->setRebindable('interact', false)                 // locked: its keys count as reserved
    ->setConflictPolicy(RebindConflictPolicy::Reject); // or Swap
$result = $map->rebind('replay', 84);                  // RebindResult: status + otherAction
$map->resetBinding('replay');
$settings['keys'] = $map->exportOverrides();          // only non-default actions
$dropped = $map->importOverrides($settings['keys']);  // re-validated on load
```

- `InputMap::poll()` / `InputMapSystem` read only `isKeyDown()` and never consume press edges.
- Reserved keys and keys of locked actions are refused (`RebindStatus::Reserved`); a clash with
  another action is `Conflict`, or with policy `Swap` the other action takes the old key.
- `KeyLabel` names keys for the UI (printable keys through the current layout, named keys via
  `input.key.<slug>` translations). `KeyCapture` is the "press a key" prompt; it polls
  `isKeyDown()` only, and Escape is excluded by default so the game can read it as cancel.

## Important Notes

- UIContext text rendering automatically benefits from fallback fonts configured on the renderer (see [Fallback Font Chain](/guide/rendering#fallback-font-chain))
- Immediate-mode `UIContext` must be called from `render()`, not `update()`
- Constructor accepts `InputInterface`, not the concrete `Input` class
- `button()` uses `isMouseButtonReleased` internally - safe on macOS
- `disabled=true` makes a button non-clickable with distinct styling
- Mouse button events are non-consuming: all callers within the same frame see the same state (required for immediate-mode UI)
