# Localization

PHPolygon's `LocaleManager` translates UI strings from JSON files with a current/fallback locale chain, `:placeholder` interpolation, and pluralization. Reach it through the [`Locale` facade](/api/facades) or `$engine->locale`.

## Loading translations

Translations are JSON files, one per locale, named `{locale}.json` (e.g. `en.json`, `de.json`). Load a directory of them in one call, or load files individually:

```php
use PHPolygon\Support\Facades\Locale;

// Load every {locale}.json in the folder
Locale::loadDirectory('assets/lang');

// ...or load files one at a time
Locale::loadFile('en', 'assets/lang/en.json');
Locale::loadFile('de', 'assets/lang/de.json');
```

JSON may be nested; the manager **flattens it to dot-keys**. Given `en.json`:

```json
{
  "menu": {
    "start": "New Game",
    "greeting": "Welcome, :name"
  }
}
```

the lookup key is `menu.start`.

## Translating

```php
Locale::t('menu.start');                          // "New Game"
Locale::t('menu.greeting', ['name' => 'Ada']);    // "Welcome, Ada"
```

Placeholders use `:name` syntax in the string and a matching (colon-less) key in the params array. `t()` is shorthand for `get()`; both behave identically. If a key is missing in the current locale it falls back to the fallback locale, then to the key string itself — so a missing translation shows the key, never an error.

## Pluralization

`choice()` selects a plural form by count. Forms are pipe-separated, and `:count` is injected automatically:

```php
// "item|items"
Locale::choice('inventory.items', 1);   // "item"
Locale::choice('inventory.items', 5);   // "items"

// explicit ranges: "{0} No messages|{1} One message|[2,*] :count messages"
Locale::choice('inbox.count', 0);       // "No messages"
Locale::choice('inbox.count', 7);       // "7 messages"
```

## Switching locale

```php
Locale::setLocale('de');
Locale::getLocale();              // "de"

Locale::setFallbackLocale('en');
Locale::getAvailableLocales();    // ['de', 'en']
Locale::has('menu.start');        // bool — exists for the current locale?
```

::: warning Live switching only re-translates strings looked up each frame
UI that calls `Locale::t()` every frame reflects a locale change immediately. Strings you resolve **once** (e.g. cached at scene load) keep their old value — re-resolve them after `setLocale()` if they must update live.
:::

## Adding strings at runtime

For generated or test content you can register translations without a file:

```php
Locale::add('en', [
    'hint.move' => 'Use WASD to move',
]);
```
