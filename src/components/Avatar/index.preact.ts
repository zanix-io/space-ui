import { h } from 'preact'
import type { VNode } from 'preact'
import { useEffect, useId, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createAvatar } from './render.ts'
import type { AvatarBaseProps } from './types.ts'

export type { AvatarBaseProps, AvatarShape, AvatarSize } from './types.ts'
export { AVATAR_SIZE_PX } from './types.ts'

/** {@linkcode AvatarBaseProps} — nothing extra for the Preact binding. */
export type AvatarProps = AvatarBaseProps

/**
 * A circular (or square) image avatar with an automatic initials fallback — see `index.ts`'s own
 * doc for the full contract, not repeated here. Preact binding, same props, same rendered markup;
 * import from `@zanix/space-ui` (no subpath) for the React one.
 */
export const Avatar: (props: AvatarProps) => VNode = createAvatar<VNode>(
  h as unknown as CreateElement<VNode>,
  { useState, useId, useEffect, useRef },
)
