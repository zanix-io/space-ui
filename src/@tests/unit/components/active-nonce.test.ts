import './dom-test-setup.ts'
import { assertEquals } from '@std/assert'
import { resolveActiveNonce } from 'shared/active-nonce.ts'

// `resolveActiveNonce` reads the `.nonce` property of the document's first nonced element — the
// same element a real server-rendered page carries in `<head>` before any component runs.

/** Inserts a parsed-from-the-server stand-in: a nonced `<style>` in `<head>`. Returns its cleanup. */
function installDocumentNonce(value: string): () => void {
  const el = document.createElement('style')
  el.nonce = value
  el.setAttribute('nonce', value)
  document.head.appendChild(el)
  return () => el.remove()
}

Deno.test('resolveActiveNonce: prefers the document nonce over a different prop value', () => {
  const cleanup = installDocumentNonce('document-nonce')
  try {
    assertEquals(resolveActiveNonce('fragment-nonce'), 'document-nonce')
  } finally {
    cleanup()
  }
})

Deno.test('resolveActiveNonce: returns the prop when the document has no nonced element', () => {
  assertEquals(resolveActiveNonce('fragment-nonce'), 'fragment-nonce')
})

Deno.test('resolveActiveNonce: never invents a nonce when none was given', () => {
  const cleanup = installDocumentNonce('document-nonce')
  try {
    assertEquals(resolveActiveNonce(undefined), undefined)
  } finally {
    cleanup()
  }
})

Deno.test('resolveActiveNonce: passes the prop through when there is no document (server render)', () => {
  const globals = globalThis as unknown as { document?: Document }
  const original = globals.document
  delete globals.document
  try {
    assertEquals(resolveActiveNonce('server-nonce'), 'server-nonce')
    assertEquals(resolveActiveNonce(undefined), undefined)
  } finally {
    globals.document = original
  }
})

Deno.test('resolveActiveNonce: falls back to the prop when the nonced element carries an empty nonce', () => {
  const el = document.createElement('style')
  el.setAttribute('nonce', '')
  document.head.appendChild(el)
  try {
    assertEquals(resolveActiveNonce('fragment-nonce'), 'fragment-nonce')
  } finally {
    el.remove()
  }
})
