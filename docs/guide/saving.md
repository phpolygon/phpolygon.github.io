# Saving & Loading

PHPolygon ships a slot-based save system. The `SaveManager` serialises a plain PHP array to disk as JSON and reads it back, so game state persists across sessions without any extra wiring. Reach it through the [`Saves` facade](/api/facades) or `$engine->saves`.

## Slots

Saves live in numbered slots, `0` to `maxSlots - 1` (default `10`). Each slot holds one save; saving to an occupied slot overwrites it. This model maps directly onto a "load game" screen with multiple named saves, plus a dedicated autosave/quicksave slot.

## Saving

```php
use PHPolygon\Support\Facades\Saves;

$slot = Saves::save(
    slotIndex: 0,
    name: 'Chapter 2 — Harbour',
    data: [
        'level'    => 3,
        'position' => [12.5, 0.0, -40.0],
        'unlocked' => ['boat', 'map'],
    ],
    metadata: ['thumbnail' => 'shots/ch2.png', 'chapter' => 'Harbour'],
    playTime: 4830.0,
);
```

- **`data`** is your game state — any JSON-serialisable array (scalars, nested arrays). It is written to disk immediately.
- **`metadata`** is optional display info for a load menu (chapter name, thumbnail path, difficulty) that you want to read *without* deserialising the whole save.
- **`playTime`** is optional seconds-played tracking.

`save()` returns the resulting `SaveSlot` and throws `InvalidArgumentException` if `slotIndex` is out of range.

## Loading

```php
$slot = Saves::load(slotIndex: 0);

if ($slot === null) {
    // empty slot — start a new game
} else {
    $level    = $slot->data['level'];
    $position = $slot->data['position'];
}
```

`load()` returns `null` for an empty slot, otherwise a `SaveSlot`:

| Property | Type | Description |
|---|---|---|
| `index` | `int` | Slot number |
| `name` | `string` | Display name passed to `save()` |
| `createdAt` | `DateTimeImmutable` | First save into this slot |
| `updatedAt` | `DateTimeImmutable` | Most recent save |
| `playTime` | `float` | Seconds played |
| `metadata` | `array` | Your display metadata |
| `data` | `array` | The full game state |

## Building a load menu

`listSlots()` returns the occupied slots' info **without** loading the full `data` payload — cheap enough to call when opening a menu:

```php
foreach (Saves::listSlots() as $info) {
    // $info->index, $info->name, $info->playTime, $info->updatedAt, $info->metadata
    renderSaveRow($info->index, $info->name, $info->metadata['chapter'] ?? '');
}
```

Other helpers:

```php
Saves::exists(0);          // bool — is the slot occupied?
Saves::findEmptySlot();    // ?int — lowest free slot, or null if full
Saves::delete(0);          // remove a slot's save from disk
```

## Patterns

- **Active-slot autosave** — remember which slot the player is in and autosave into it on key beats (level complete, quit, pause). Keep a single "active slot" variable in your game state.
- **Skip the intro on load** — when a save is loaded, jump straight into the gameplay scene instead of replaying the boot/intro sequence; only show the intro when starting fresh.
- **Keep `data` flat and serialisable** — store ids, coordinates and primitives, not live objects. Rehydrate entities from that data when the scene loads.

::: tip Custom location & slot count
The manager is constructed with a save path and slot count (`new SaveManager($savePath, $maxSlots)`). In a normal game the engine wires this for you and you only touch the `Saves` facade.
:::
