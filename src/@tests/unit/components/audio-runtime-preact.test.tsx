import { assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { setAssetsManifestState } from '@zanix/space/assets-manifest'
import { Audio } from '../../../runtime/audio.preact.ts'

// This is the `@zanix/space`-dependent `@zanix/space-ui/runtime/audio/preact` binding —
// `resolveAssetHref` is injected (see `src/runtime/audio.preact.ts`'s own doc). Every OTHER
// behavior is identical to the root-barrel `Audio` and already covered by `audio-preact.test.tsx`
// — this file only covers the resolver-specific delta.

Deno.test('Audio (runtime, preact): a local file path resolves through resolveAssetHref', () => {
  setAssetsManifestState({
    manifest: { 'voice-message.mp3': '/assets/voice-message-abc123.mp3' },
  })
  try {
    const vnode = Audio({ src: 'voice-message.mp3' })
    assertStringIncludes(render(vnode), 'src="/assets/voice-message-abc123.mp3"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test(
  'Audio (runtime, preact): a local file path falls back to /assets/<path> when unresolved',
  () => {
    const vnode = Audio({ src: 'voice-message.mp3' })
    assertStringIncludes(render(vnode), 'src="/assets/voice-message.mp3"')
  },
)

Deno.test('Audio (runtime, preact): a relative source src resolves through resolveAssetHref', () => {
  setAssetsManifestState({
    manifest: { 'voice-message.ogg': '/assets/voice-message-hd-abc123.ogg' },
  })
  try {
    const vnode = Audio({
      src: 'voice-message.mp3',
      sources: [{ src: 'voice-message.ogg' }],
    })
    assertStringIncludes(render(vnode), 'src="/assets/voice-message-hd-abc123.ogg"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Audio (runtime, preact): an absolute file URL still passes through untouched', () => {
  const vnode = Audio({ src: 'https://cdn.example.com/clip.mp3' })
  assertStringIncludes(render(vnode), 'src="https://cdn.example.com/clip.mp3"')
})

Deno.test('Audio (runtime, preact): a blob: Object URL still passes through untouched', () => {
  const vnode = Audio({ src: 'blob:https://example.com/9f1c1e2a-1234-4a3b-8b1d-abcdefabcdef' })
  assertStringIncludes(
    render(vnode),
    'src="blob:https://example.com/9f1c1e2a-1234-4a3b-8b1d-abcdefabcdef"',
  )
})
