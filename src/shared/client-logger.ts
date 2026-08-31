/**
 * The one shared, browser-safe `Logger` instance every browser-bundled component in this package
 * logs through — `Modal`/`Drawer`'s own `render.ts` (and any future component with the same need)
 * import THIS module instead of `@zanix/utils/logger` (the full, server-capable entry) directly.
 *
 * Importing `@zanix/utils/logger` from a browser bundle pulls in `WorkerManager`/
 * `Deno.readTextFile`-backed file storage (`defaults/storage/default.ts`) and — since neither
 * resolves to a local file for a browser bundler — real, remote `https://jsr.io/...` fetches for
 * `@std/fmt/colors`/`@std/path` on every page load, confirmed as a real, reproduced regression (a
 * `Modal`/`Drawer` consumer's own error page took noticeably longer to become interactive, traced
 * to exactly this chain via the browser's own Network panel). `@zanix/utils@3.1.0`'s
 * `createClientLogger` (`@zanix/utils/logger/client`) exists specifically to give a browser client
 * its own entry point that never reaches any of that — see that function's own doc for the
 * mechanism. `@zanix/space`'s own `modules/client/client-logger.ts` establishes the identical
 * pattern for the exact same reason; this is that same fix, for this package.
 *
 * Unlike `@zanix/space`'s own version, this package has no backend route of its own to relay a
 * formatted log entry to — `@zanix/space-ui` is a standalone component library, mounted into
 * whichever app happens to consume it, with no `/api/log`-style endpoint this package could assume
 * exists. The `fetcher` below is therefore a no-op: `showMessage` (inside `Logger`'s own
 * implementation) already prints every call to the real `console.*` regardless of what the
 * `fetcher` does — a no-op only skips PERSISTING the entry somewhere, never the console output a
 * developer actually needs to see `Modal`/`Drawer`'s own accessibility warnings. Every real call
 * site in this package additionally passes `'noSave'` (see `Modal`/`Drawer`'s own `render.ts`) for
 * the same reason stated twice, deliberately: these are ephemeral dev-time hints, never meant to be
 * persisted by ANY consumer's own logging backend, whether or not this fetcher ever does anything.
 *
 * @module
 */
import { createClientLogger } from '@zanix/utils/logger/client'
import type { Logger } from '@zanix/utils/logger/client'

/** The shared browser-safe logger every browser-bundled module in this package imports instead of
 * `@zanix/utils/logger` directly. See this module's own top-level doc. */
const logger: Logger = createClientLogger(() => {})

export default logger
