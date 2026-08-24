/**
 * Shared base for `ModalProps` — `children`'s own type is genuinely renderer-specific, same
 * reasoning `Slider`'s own `SliderBaseProps` doesn't declare `children` either; each of
 * `index.ts`/`index.preact.ts` adds it.
 */
export type ModalBaseProps = {
  open: boolean
  /** Called whenever this modal wants to close — the close button, `Escape`, or an outside click
   * (only when `showOverlay` is `false`, see `index.ts`'s own doc). Always the single source of
   * truth for closing: this component never closes itself independently of this callback. */
  onClose: () => void
  /** A dimmed backdrop behind the dialog. Also controls the outside-click contract: `true` (the
   * default) never closes on an outside click — the backdrop itself absorbs it; `false` renders no
   * backdrop and closes on any click outside the dialog. Not a separate `closeOnOutsideClick` prop
   * — see `index.ts`'s own doc for why that would just be a second way to say the same thing.
   * @default true */
  showOverlay?: boolean
  /** @default true */
  closeOnEscape?: boolean
  /** @default 'center' */
  position?: ModalPosition
  id?: string
  className?: string
}

/** Where the dialog sits on screen — passed as {@linkcode ModalBaseProps.position}. */
export type ModalPosition =
  | 'center'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'middle-left'
  | 'middle-right'

/**
 * A dialog needs an accessible name from somewhere — `label` (a plain `aria-label`) or
 * `ariaLabelledBy` (an id already present in the DOM, e.g. a heading rendered inside `children`).
 * This union makes "at least one of the two" a compile error to skip entirely, without forbidding
 * supplying both (native ARIA lets `aria-labelledby` and `aria-label` coexist — the former wins).
 * Deliberately not enforced with a runtime throw the way `useIntl()` throws outside a provider —
 * see `index.ts`'s own doc for why a missing accessible name is treated as a real, but
 * non-fatal, accessibility gap to catch in development, not a structural misuse that should bring
 * the whole render down.
 */
export type ModalAccessibleName =
  | { label: string; ariaLabelledBy?: string }
  | { label?: undefined; ariaLabelledBy: string }

/**
 * Functional, not decorative — `position: fixed` is what makes this component actually BE a
 * modal (rendered above everything else, regardless of where it sits in the tree); a headless
 * `Modal` that didn't overlay anything without a consumer's own CSS would be a broken component,
 * not a legitimately unstyled one. Same footing as `Slider`'s visually-hidden live region or
 * `Image`'s placeholder `background` — a narrow, deliberate exception to "className is the only
 * styling mechanism," not a precedent for adding more. Everything else (color, shadow, padding,
 * border-radius, width) stays entirely `className`'s job.
 */
const EDGE_MARGIN = '1rem'

export const MODAL_POSITION_STYLE: Record<ModalPosition, Record<string, string>> = {
  center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  'top-left': { top: EDGE_MARGIN, left: EDGE_MARGIN },
  'top-center': { top: EDGE_MARGIN, left: '50%', transform: 'translateX(-50%)' },
  'top-right': { top: EDGE_MARGIN, right: EDGE_MARGIN },
  'middle-left': { top: '50%', left: EDGE_MARGIN, transform: 'translateY(-50%)' },
  'middle-right': { top: '50%', right: EDGE_MARGIN, transform: 'translateY(-50%)' },
  'bottom-left': { bottom: EDGE_MARGIN, left: EDGE_MARGIN },
  'bottom-center': { bottom: EDGE_MARGIN, left: '50%', transform: 'translateX(-50%)' },
  'bottom-right': { bottom: EDGE_MARGIN, right: EDGE_MARGIN },
}

/** Backdrop stays below the dialog; both comfortably above ordinary page content. With several
 * modals open, every instance shares these same two values — later-mounted ones still paint on
 * top, since equal-z-index siblings stack by document order, and a later `open` always mounts
 * later. No per-instance z-index math needed. */
export const MODAL_Z_INDEX = { backdrop: 999, dialog: 1000 } as const
