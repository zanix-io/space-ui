import { useEffect, useId, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createElementWithNonceHydrationFix } from 'shared/create-element-nonce-hydration-fix.ts'
import { createAvatar } from './render.ts'
import type { AvatarBaseProps } from './types.ts'

export type { AvatarBaseProps, AvatarShape, AvatarSize } from './types.ts'
export { AVATAR_SIZE_PX } from './types.ts'

/** {@linkcode AvatarBaseProps} — nothing extra for the React binding. */
export type AvatarProps = AvatarBaseProps

/**
 * A circular (or square) image avatar with an automatic initials fallback, derived from
 * {@linkcode AvatarBaseProps.name}, whenever `src` is omitted or the image fails to load. Real
 * implementation shared with the Preact binding via `render.ts`'s own `createAvatar` (composes the
 * unmodified, comet-safe root-barrel `Image` and reuses its own `onError` callback — see that
 * file's own doc for the full contract, including why the circular/square treatment lives in an
 * optional companion CSS file rather than an inline style); import from `@zanix/space-ui/preact`
 * instead for the Preact one, same contract, same rendered behavior.
 *
 * `data-space-ui="avatar"` on the root, with `data-shape` reflecting
 * {@linkcode AvatarBaseProps.shape} — same convention `Card`'s own `data-align`/`data-stacked`
 * already establish. See `src/templates/shared/avatar.css` (optional, never imported by this
 * component) for the real `border-radius` this maps to; without it, `Avatar` still renders fully
 * valid, correctly sized markup, just as a plain rectangle.
 *
 * @example
 * ```tsx
 * <Avatar name="Ada Lovelace" src="https://cdn.example.com/ada.jpg" size="lg" />
 * <Avatar name="Prince" shape="square" />
 * ```
 */
export const Avatar: (props: AvatarProps) => ReactElement = createAvatar<ReactElement>(
  createElementWithNonceHydrationFix as unknown as CreateElement<ReactElement>,
  { useState, useId, useEffect, useRef },
)
