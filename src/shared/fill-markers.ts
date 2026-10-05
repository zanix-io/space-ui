/**
 * Replaces every `{name}` marker in `template` with `values[name]`. A marker with no matching value
 * is left as written, so a forgotten value stays visible instead of vanishing. Used by the
 * components whose text props carry dynamic values (`{year}`, `{n}`, `{name}`, `{minutes}`): the
 * consumer passes an already-translated template, the component fills in the values.
 */
export function fillMarkers(template: string, values?: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (marker, name) => String(values?.[name] ?? marker))
}
