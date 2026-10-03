import { createElement, useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createFileInput } from './render.ts'
import type { FileInputBaseProps } from './types.ts'

/** {@linkcode FileInputBaseProps} — nothing extra for the React binding. */
export type FileInputProps = FileInputBaseProps

/**
 * A thin wrapper around a native `<input type="file">` — genuinely different contract from
 * `Input`, not a `type` variant of it: browsers never let a script SET `.value`/`.files` to a
 * specific selection (a real, permanent security restriction, not a gap in this component), so the
 * usual `value`/`onValueChange` controlled-input shape doesn't apply here. Real implementation
 * shared with the Preact binding via `render.ts`'s own `createFileInput` (see that file's own doc
 * for how, and for why — unlike `Input` — no `onChange`/`onInput` split is needed here, checked
 * directly against React's own source, not assumed); import from `@zanix/space-ui/preact` instead
 * for the Preact one, same contract, same rendered behavior. Owns no form state of its own —
 * `space-ui-architecture`'s seam 7.
 *
 * `onFilesChange` always fires with a real `File[]` (converted from the native `FileList`), never
 * the raw `FileList` — a caller never needs to reach for `.item(i)`/array-like iteration
 * themselves. This component owns nothing beyond what the native uncontrolled input already
 * tracks: no add/remove-file UI, no upload progress, no preview — real, consumer-side composition
 * territory this package deliberately stays out of, the same "presents data, never owns it" seam
 * every component here keeps.
 *
 * `accept`/`multiple`/`capture` pass straight through to the real native attributes, unmodified.
 *
 * ## `resetTrigger`, not a controlled `value`
 *
 * Since the platform gives no way to set a selection programmatically, clearing one (a real,
 * common need — e.g. after a successful upload) is exposed the same "can't be controlled directly,
 * so expose a change-triggered escape hatch instead" way `Recaptcha`/`HCaptcha`/`Turnstile`'s own
 * `resetTrigger` already does for an analogous platform constraint — see
 * {@linkcode FileInputBaseProps.resetTrigger}'s own doc for the full contract. Not a new pattern
 * invented for this component.
 *
 * ## Reporting a value as invalid
 *
 * `validationMessage` hands the caller's own verdict to the browser's native constraint
 * validation (`setCustomValidity` on the real `<input type="file">`): an unacceptable selection
 * blocks a `<form>` submit and shows the browser's message, with no ref or listener on the caller's
 * side. This component never decides what is valid, and `aria-invalid` stays the caller's — see
 * {@linkcode FileInputBaseProps.validationMessage}. The browser keeps a custom validity when the
 * selection changes, so the caller recomputes it from `onFilesChange` and passes `undefined` once
 * the files are acceptable. The input is rendered visible and never hidden by this component; a
 * caller that hides it visually must not use `display: none` or `hidden`, which take it out of
 * constraint validation.
 *
 * ## Composing inside `Field`
 *
 * Accepts exactly the props `Field`'s own render-prop hands back (`FieldRenderProps`, imported
 * from `components/Field/types.ts`) — `id`, `aria-describedby`, `aria-invalid` share the identical
 * prop name, so spreading `fieldProps` straight onto `FileInput` is the whole integration.
 *
 * @example
 * ```tsx
 * <Field label="Attachments" error={errors.attachments}>
 *   {(fieldProps) => (
 *     <FileInput
 *       {...fieldProps}
 *       accept="image/*"
 *       multiple
 *       onFilesChange={setAttachments}
 *       resetTrigger={uploadedCount}
 *     />
 *   )}
 * </Field>
 * ```
 */
export const FileInput: (props: FileInputProps) => ReactElement = createFileInput<ReactElement>(
  createElement as unknown as CreateElement<ReactElement>,
  { useEffect, useRef },
)
