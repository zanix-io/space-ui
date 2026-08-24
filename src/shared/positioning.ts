/**
 * Anchors a floating element — `Popover`'s panel, `Tooltip`'s panel, `Combobox`'s listbox — to a
 * reference/trigger element: 12 placements, collision detection against a boundary, flip to the
 * opposite side when the preferred one doesn't fit, shift along the cross axis to stay in bounds
 * without changing sides.
 *
 * Pure geometry, no DOM — the layer that measures real elements and keeps the position live as
 * things move (`ResizeObserver`, scroll listeners) is `positioning-dom.ts`, which builds on this
 * without needing any React/Preact hook machinery. `usePosition` (`use-position.ts`/
 * `use-position.preact.ts`) is the per-renderer hook that wires both of these into a real
 * component's own render cycle; `Popover`, `Tooltip`, and `Combobox` all resolve their own
 * position through it.
 */

/** A rectangle in a single shared coordinate space, measured from its own top-left corner. */
export type Rect = { x: number; y: number; width: number; height: number }
/** A 2D size — typically the floating element's own measured width/height. */
export type Size = { width: number; height: number }

/** Which edge of the reference element the floating element is anchored to. */
export type Side = 'top' | 'bottom' | 'left' | 'right'
/** Where along the cross axis the floating element aligns, relative to the reference element. */
export type Alignment = 'start' | 'end'
/** A {@linkcode Side}, optionally combined with an {@linkcode Alignment} (e.g. `'bottom-start'`). */
export type Placement = Side | `${Side}-${Alignment}`

/** Options controlling where {@linkcode computePosition} places the floating element. */
export type ComputePositionOptions = {
  /** @default 'bottom' */
  placement?: Placement
  /** Gap, in px, between the reference and floating element along the main axis. @default 0 */
  offset?: number
  /**
   * The available space to avoid overflowing — typically the viewport, but any rect (a scroll
   * container's own bounds) works identically. Defaults to an effectively infinite rect, which
   * makes `flip`/`shift` unconditional no-ops — pass a real boundary to get real collision
   * detection; `positioning-dom.ts`'s own helpers do this for you against the real viewport.
   */
  boundary?: Rect
  /** Try the opposite side when the preferred placement doesn't fit the boundary on the main
   * axis. Only switches if the opposite side actually fits — never flips into a WORSE overflow.
   * @default true */
  flip?: boolean
  /** Clamp the position along the cross axis to stay within the boundary, without changing which
   * side the floating element is on. @default true */
  shift?: boolean
}

/** The resolved coordinates and placement returned by {@linkcode computePosition}. */
export type ComputePositionResult = {
  x: number
  y: number
  /** The placement actually used — may differ from the requested one if `flip` changed it. */
  placement: Placement
}

// A real `Infinity` here would break arithmetic downstream — `boundary.x + boundary.width` with
// `x: -Infinity, width: Infinity` is `-Infinity + Infinity`, which is `NaN` per IEEE 754, not a
// large finite number. A very large but FINITE sentinel avoids that trap entirely while still
// being "infinite" for any real layout (no real DOM rect approaches a billion px).
const LARGE = 1_000_000_000
const INFINITE_BOUNDARY: Rect = { x: -LARGE, y: -LARGE, width: 2 * LARGE, height: 2 * LARGE }

function getSide(placement: Placement): Side {
  return placement.split('-')[0] as Side
}

function getAlignment(placement: Placement): Alignment | undefined {
  return placement.split('-')[1] as Alignment | undefined
}

function getOppositeSide(side: Side): Side {
  return ({ top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const)[side]
}

function withSide(side: Side, alignment: Alignment | undefined): Placement {
  return alignment ? `${side}-${alignment}` : side
}

/** Coordinates for a given placement, ignoring collision entirely — the raw geometry before
 * `flip`/`shift` get a chance to adjust it. */
function getCoordsForPlacement(
  referenceRect: Rect,
  floatingSize: Size,
  placement: Placement,
): { x: number; y: number } {
  const side = getSide(placement)
  const alignment = getAlignment(placement)

  const mainAxisIsVertical = side === 'top' || side === 'bottom'

  // Cross-axis position: centered by default, or flush with the reference's own start/end edge.
  const crossAxisCentered = mainAxisIsVertical
    ? referenceRect.x + (referenceRect.width - floatingSize.width) / 2
    : referenceRect.y + (referenceRect.height - floatingSize.height) / 2
  const crossAxisStart = mainAxisIsVertical ? referenceRect.x : referenceRect.y
  const crossAxisEnd = mainAxisIsVertical
    ? referenceRect.x + referenceRect.width - floatingSize.width
    : referenceRect.y + referenceRect.height - floatingSize.height
  const crossAxisPosition = alignment === 'start'
    ? crossAxisStart
    : alignment === 'end'
    ? crossAxisEnd
    : crossAxisCentered

  switch (side) {
    case 'top':
      return { x: crossAxisPosition, y: referenceRect.y - floatingSize.height }
    case 'bottom':
      return { x: crossAxisPosition, y: referenceRect.y + referenceRect.height }
    case 'left':
      return { x: referenceRect.x - floatingSize.width, y: crossAxisPosition }
    case 'right':
      return { x: referenceRect.x + referenceRect.width, y: crossAxisPosition }
  }
}

function applyOffset(
  coords: { x: number; y: number },
  side: Side,
  offset: number,
): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { ...coords, y: coords.y - offset }
    case 'bottom':
      return { ...coords, y: coords.y + offset }
    case 'left':
      return { ...coords, x: coords.x - offset }
    case 'right':
      return { ...coords, x: coords.x + offset }
  }
}

/** Whether the floating element (at `coords`, given its own `floatingSize`) overflows `boundary`
 * on `side`'s own main axis — the ONE axis `flip` cares about, never the cross axis (`shift`'s
 * own job). */
function overflowsMainAxis(
  coords: { x: number; y: number },
  floatingSize: Size,
  side: Side,
  boundary: Rect,
): boolean {
  switch (side) {
    case 'top':
      return coords.y < boundary.y
    case 'bottom':
      return coords.y + floatingSize.height > boundary.y + boundary.height
    case 'left':
      return coords.x < boundary.x
    case 'right':
      return coords.x + floatingSize.width > boundary.x + boundary.width
  }
}

/** Clamps `coords` along the CROSS axis only, so the floating element stays inside `boundary`
 * without ever changing which side it's on (that's `flip`'s own job, already resolved by the time
 * this runs). */
function shiftIntoBoundary(
  coords: { x: number; y: number },
  floatingSize: Size,
  side: Side,
  boundary: Rect,
): { x: number; y: number } {
  const mainAxisIsVertical = side === 'top' || side === 'bottom'

  if (mainAxisIsVertical) {
    const minX = boundary.x
    const maxX = boundary.x + boundary.width - floatingSize.width
    return { ...coords, x: Math.min(Math.max(coords.x, minX), Math.max(minX, maxX)) }
  }

  const minY = boundary.y
  const maxY = boundary.y + boundary.height - floatingSize.height
  return { ...coords, y: Math.min(Math.max(coords.y, minY), Math.max(minY, maxY)) }
}

/**
 * Computes where a floating element should sit relative to `referenceRect`, given its own
 * `floatingSize` — pure function of its inputs, no DOM measurement of its own (see
 * `positioning-dom.ts` for that). `referenceRect`/`boundary` share one coordinate space (typically
 * viewport-relative, the same space `getBoundingClientRect()` already returns).
 */
export function computePosition(
  referenceRect: Rect,
  floatingSize: Size,
  options: ComputePositionOptions = {},
): ComputePositionResult {
  const {
    placement: requestedPlacement = 'bottom',
    offset = 0,
    boundary = INFINITE_BOUNDARY,
    flip = true,
    shift = true,
  } = options

  let placement = requestedPlacement
  let coords = applyOffset(
    getCoordsForPlacement(referenceRect, floatingSize, placement),
    getSide(placement),
    offset,
  )

  if (flip && overflowsMainAxis(coords, floatingSize, getSide(placement), boundary)) {
    const flippedPlacement = withSide(getOppositeSide(getSide(placement)), getAlignment(placement))
    const flippedCoords = applyOffset(
      getCoordsForPlacement(referenceRect, floatingSize, flippedPlacement),
      getSide(flippedPlacement),
      offset,
    )
    // Only actually flip if the opposite side is a real improvement — never trade one overflow
    // for a different one.
    if (!overflowsMainAxis(flippedCoords, floatingSize, getSide(flippedPlacement), boundary)) {
      placement = flippedPlacement
      coords = flippedCoords
    }
  }

  if (shift) {
    coords = shiftIntoBoundary(coords, floatingSize, getSide(placement), boundary)
  }

  return { x: coords.x, y: coords.y, placement }
}
