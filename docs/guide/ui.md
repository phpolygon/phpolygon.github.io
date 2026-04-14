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

## Important Notes

- Immediate-mode `UIContext` must be called from `render()`, not `update()`
- Constructor accepts `InputInterface`, not the concrete `Input` class
- `button()` uses `isMouseButtonReleased` internally - safe on macOS
- `disabled=true` makes a button non-clickable with distinct styling
- Mouse button events are non-consuming: all callers within the same frame see the same state (required for immediate-mode UI)
