/**
 * The signature shared by React's `createElement` and Preact's `h` — both accept a host element
 * tag, a props object (or `null`), and any number of children, and return their own renderer's
 * element type. A shared component factory (see `components/Icon/render.ts` for a real example)
 * is typed against ONLY this shape — never against `React.createElement`'s or `h`'s own concrete,
 * more specific signature — so the exact same factory function can be bound to either one without
 * either renderer's own types leaking into the shared, renderer-agnostic file.
 */
export type CreateElement<E = unknown> = (
  type: string,
  props: Record<string, unknown> | null,
  ...children: unknown[]
) => E
