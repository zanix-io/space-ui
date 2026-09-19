/**
 * Resolves the CSP nonce a component's own `<style nonce>` element has to carry to pass a
 * nonce-based `style-src`.
 *
 * A browser enforces the nonce of the document response that created the document, for the
 * document's whole lifetime. A client-side navigation that swaps only part of the page fetches a
 * new fragment whose server-side nonce is a different, separately-minted value, and a component
 * hydrated from that fragment receives the fragment's nonce as its `nonce` prop. A `<style>` the
 * component then renders client-side with that prop is blocked, since it doesn't match what the
 * browser enforces. The nonce the browser actually enforces is the one on an element the parser
 * inserted from the original document, which this reads from the first nonced element.
 *
 * A component that was given no `nonce` prop stays without one: an app with no nonce-based
 * `style-src` never receives a nonce here it didn't ask for. With no `document` (server render) the
 * prop passes through untouched, so the server-rendered markup is identical to the plain prop.
 *
 * Reads the `.nonce` property, never `getAttribute('nonce')`: a browser clears the content
 * attribute of an applied nonce back to `""`, and only the IDL property keeps the real value.
 *
 * @module
 */

/**
 * Returns the nonce the current document enforces, falling back to `nonce` when there is no
 * document or no nonced element to read. Returns `undefined` when `nonce` itself is `undefined`.
 */
export function resolveActiveNonce(nonce: string | undefined): string | undefined {
  if (nonce === undefined || typeof document === 'undefined') return nonce
  const nonced = document.querySelector('[nonce]') as (Element & { nonce?: string }) | null
  return nonced?.nonce || nonce
}
