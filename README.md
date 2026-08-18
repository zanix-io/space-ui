# Zanix - Space UI

[![Version](https://img.shields.io/jsr/v/@zanix/space-ui?color=blue&label=jsr)](https://jsr.io/@zanix/space-ui/versions)

[![Release](https://img.shields.io/github/v/release/zanix-io/space-ui?color=blue&label=git)](https://github.com/zanix-io/space-ui/releases)

[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

1. [Description](#description)
2. [Current status](#current-status)
3. [Design principle](#design-principle)
4. [Installation](#installation)
5. [Basic Usage](#basic-usage)
6. [Documentation](#documentation)
7. [Changelog](#changelog)
8. [License](#license)

## Description

A component library for apps built on [`@zanix/space`](https://jsr.io/@zanix/space) — presentational
building blocks (icons, social buttons, structured data, and eventually interactive pieces) that
stay usable on their own terms rather than assuming Space's full stack is present.

## Current status

Early and intentionally small. Only what's listed below is implemented — nothing else is stubbed
ahead of time:

- ✅ **`Icon`** — an SVG sprite icon (`<svg><use href="#..." /></svg>`). Takes an already-resolved
  sprite `href`, a symbol `name`, and an explicit `viewBox` — no client-side fetch-and-sniff, no
  flash of an empty icon while a real `viewBox` loads in.
- ✅ **`SocialNetworks`** — a list of external social links, each an accessible `<a>` wrapping
  either an `Icon` or an image logo. Default accessible label/tooltip built from the network name;
  both overridable per link. Renders nothing for an empty list.
- ✅ **`StructuredData`** — a JSON-LD `<script>` tag from typed [schema.org](https://schema.org)
  data (`schema-dts`). Renders `data` exactly as given; defaults `@context` to
  `'https://schema.org'` only when `data` doesn't already set it. Its own resolution logic is also
  available standalone as **`resolveStructuredData`**, independent of any renderer.
- ✅ **`Link`** — a plain `<a>` with sensible external-link attributes, overridable `rel`, and an
  optional `onClick` alongside navigation. No internal-routing special case: `@zanix/space`'s own
  Orbit navigation intercepts plain anchor clicks without an opt-in component, unlike
  `react-router`'s `Link`.
- ✅ **`Button`** — a real `<button>`, split out from `Link` (an action belongs on a button, never
  an anchor styled to look like one). `onClick` optional, `name`/`value` for multi-action forms, no
  forced accessible-name prop when visible text already provides one. `role="switch"`/`"tab"`/etc.
  require their own WAI-ARIA companion state (`checked`/`selected`) at the type level — impossible
  to forget, not just documented.

All five ship for **both React and Preact** (see [Installation](#installation)).

Not implemented yet: anything with real interactive state (`Menu`, `Modal`, `Slider`), and a
package-level styling convention beyond "consume `@zanix/space`'s own semantic design tokens, never
author new ones here."

## Design principle

Every component takes already-resolved data as props — a URL, a label, a `viewBox` — never a "source
name" or an i18n key it resolves itself. This package doesn't know how a consuming app serves
assets, translates strings, or manages responsive breakpoints; those stay the app's own concern (or
`@zanix/space`'s, once it has them). That keeps `@zanix/space-ui` genuinely optional and versioned
independently of the rendering engine it's meant to sit on top of — an app can use `@zanix/space`
without ever installing this package.

**React and Preact both work, with no `preact/compat` shim.** A presentational component with no
per-renderer hook usage has its real logic written once against `React.createElement`/`Preact.h`'s
shared call signature — never JSX, never a runtime "which renderer am I" check — then bound to each
renderer exactly once. A component with real interactive state won't fit that pattern and will ship
as a genuine second implementation instead, mirroring how `@zanix/space` itself splits its own
React/Preact render paths.

## Installation

```ts
// React (default)
import { Icon } from 'jsr:@zanix/space-ui@[version]'

// Preact — same props, same markup
import { Icon } from 'jsr:@zanix/space-ui@[version]/preact'
```

## Basic Usage

```tsx
import { Icon } from 'jsr:@zanix/space-ui@[version]'

function NextButton() {
  return (
    <button>
      Next{' '}
      <Icon
        name='arrow-right'
        href='/assets/icons/sprite.svg'
        viewBox='0 0 24 24'
      />
    </button>
  )
}
```

`href` is whatever URL your app already serves the sprite at — with `@zanix/space`, that's typically
a file under `assetsDir`, served at `/assets/<path>` (see `@zanix/space`'s own documentation for
that mechanism).

## Documentation

- [`docs/see-more.md`](./docs/see-more.md) — placeholder for guides as the component set grows.

## Changelog

For a detailed list of changes, refer to the [CHANGELOG](./CHANGELOG.md).

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for more
details.
