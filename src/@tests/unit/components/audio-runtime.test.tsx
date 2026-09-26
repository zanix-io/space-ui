import { assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { setAssetsManifestState } from '@zanix/space/assets-manifest'
import { Audio } from '../../../runtime/audio.ts'

// This is the `@zanix/space`-dependent `@zanix/space-ui/runtime/audio` binding —
// `resolveAssetHref` is injected (see `src/runtime/audio.ts`'s own doc), so a relative
// file/sources[].src path auto-resolves. Every OTHER behavior (native `<audio>` attributes, sources
// ordering, data-space-ui placement) is identical to the root-barrel `Audio` and already covered by
// `audio.test.tsx` — this file only covers the resolver-specific delta.

Deno.test('Audio (runtime): a local file path resolves through resolveAssetHref', () => {
  setAssetsManifestState({
    manifest: { 'voice-message.mp3': '/assets/voice-message-abc123.mp3' },
  })
  try {
    const html = renderToStaticMarkup(<Audio src='voice-message.mp3' />)
    assertStringIncludes(html, '<audio')
    assertStringIncludes(html, 'src="/assets/voice-message-abc123.mp3"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test(
  'Audio (runtime): a local file path falls back to /assets/<path> when unresolved',
  () => {
    const html = renderToStaticMarkup(<Audio src='voice-message.mp3' />)

    assertStringIncludes(html, 'src="/assets/voice-message.mp3"')
  },
)

Deno.test('Audio (runtime): a relative source src resolves through resolveAssetHref', () => {
  setAssetsManifestState({
    manifest: { 'voice-message.ogg': '/assets/voice-message-hd-abc123.ogg' },
  })
  try {
    const html = renderToStaticMarkup(
      <Audio src='voice-message.mp3' sources={[{ src: 'voice-message.ogg' }]} />,
    )
    assertStringIncludes(html, 'src="/assets/voice-message-hd-abc123.ogg"')
  } finally {
    setAssetsManifestState(undefined)
  }
})

Deno.test('Audio (runtime): an absolute file URL still passes through untouched', () => {
  const html = renderToStaticMarkup(<Audio src='https://cdn.example.com/clip.mp3' />)

  assertStringIncludes(html, 'src="https://cdn.example.com/clip.mp3"')
})

Deno.test('Audio (runtime): a blob: Object URL still passes through untouched', () => {
  const html = renderToStaticMarkup(
    <Audio src='blob:https://example.com/9f1c1e2a-1234-4a3b-8b1d-abcdefabcdef' />,
  )

  assertStringIncludes(
    html,
    'src="blob:https://example.com/9f1c1e2a-1234-4a3b-8b1d-abcdefabcdef"',
  )
})
