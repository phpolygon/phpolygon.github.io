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

Placeholders use `:name` syntax in the string and a matching (colon-less) key in the params array. `t()` is shorthand for `get()`; both behave identically. If a key is missing in the current locale it falls back to the fallback locale, then to the key string itself – so a missing translation shows the key, never an error.

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
Locale::has('menu.start');        // bool – exists for the current locale?
```

::: warning Live switching only re-translates strings looked up each frame
UI that calls `Locale::t()` every frame reflects a locale change immediately. Strings you resolve **once** (e.g. cached at scene load) keep their old value – re-resolve them after `setLocale()` if they must update live.
:::

## Start language - Steam, then the system

A game's first start should speak the player's language without asking. The engine resolves it;
the game only passes the locales it ships and a fallback. No `ext-intl` needed.

```php
use PHPolygon\Platform\LanguageResolver;
use PHPolygon\Platform\SteamSession;

SteamSession::start();   // no-op without php-steamworks or a running Steam client
$start = (new LanguageResolver($shippedCodes, 'en'))->resolve($savedChoiceOrNull);
Locale::setLocale($start->locale);

// Persist only a choice the player made in the options - never $start when
// !$start->wasChosen(), or a later Steam/OS language change is never followed.
```

| Class | Purpose |
|---|---|
| `Locale\LocaleMatcher` | `normalize()` any tag (`de_DE.UTF-8@euro` → `de-DE`) and `match()` it against the shipped catalogue: exact, regional rules (es outside Spain → `es-419`, pt outside Brazil → `pt-PT`, zh by script), language, any region of that language. `$aliases` maps catalogue codes that are not tags (`['latam' => 'es-419']`) |
| `Platform\SteamSession` | Idempotent `start()`, `runCallbacks()` per frame, `shutdown()` |
| `Platform\SteamLanguage` | All 31 Steam API language codes → tags; `detect()` = per-game language, then the client UI language |
| `Platform\SystemLanguage` | Windows user locale, Unix `LANGUAGE`/`LC_ALL`/`LC_MESSAGES`/`LANG`, macOS `AppleLanguages` |
| `Platform\LanguageResolver` + `ResolvedLanguage` | saved > Steam > system > fallback; `source` says which won, `wasChosen()` whether to persist |

## Adding strings at runtime

For generated or test content you can register translations without a file:

```php
Locale::add('en', [
    'hint.move' => 'Use WASD to move',
]);
```
