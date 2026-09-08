import { h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createSocialLinksInput } from './render.ts'
import type { SocialLinkEntry, SocialLinksInputBaseProps } from './types.ts'

export type { SocialLinkEntry, SocialLinkEntryPayload, SocialNetworkName } from './types.ts'

/** {@linkcode SocialLinksInputBaseProps} plus the Preact-specific `renderIcon` node type. */
export type SocialLinksInputProps = SocialLinksInputBaseProps & {
  renderIcon?: (entry: SocialLinkEntry) => ComponentChildren | null
}

/**
 * The editable counterpart to the display-only `SocialNetworks` — see `index.ts`'s own doc for the
 * full description. Preact binding, same props, same rendered markup; import from
 * `@zanix/space-ui` (no subpath) for the React one.
 */
// Same overload-set mismatch as `Icon/index.preact.ts`'s own cast, same reasoning.
export const SocialLinksInput: (props: SocialLinksInputProps) => VNode = createSocialLinksInput<
  VNode
>(
  h as unknown as CreateElement<VNode>,
  { useState, useRef },
  'onInput',
) as (props: SocialLinksInputProps) => VNode
