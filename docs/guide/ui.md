# UI System

PHPolygon provides `UIContext`, an immediate-mode UI toolkit for in-game interfaces.

## Basic Usage

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

## Widgets

| Widget | Method | Returns |
|---|---|---|
| Button | `button(id, label, width, disabled?)` | `bool`  - true on release |
| Checkbox | `checkbox(id, label, value)` | `bool`  - new value |
| Label | `label(text)` | `void` |
| Separator | `separator()` | `void` |

## Layout

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

## Important Notes

- `UIContext` must be called from `render()`, not `update()`
- Constructor accepts `InputInterface`, not the concrete `Input` class
- `button()` uses `isMouseButtonReleased` internally  - safe on macOS
- `disabled=true` makes a button non-clickable with distinct styling
