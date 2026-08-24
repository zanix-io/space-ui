import type { TemplateArea } from './types.ts'

/** Resolves {@linkcode TemplateArea} shorthand into a real CSS grid track-list value. Pure,
 * renderer-agnostic — no `h`/`createElement` involved, same reasoning `StructuredData`'s own
 * `resolveStructuredData` is exported standalone for. */
export function resolveTemplateArea(area?: TemplateArea): string {
  if (!area) return 'repeat(auto-fit, minmax(100px, 1fr))'
  if (typeof area === 'number') return `repeat(${area}, 1fr)`
  if (Array.isArray(area)) return area.join(' ')
  return area
}
