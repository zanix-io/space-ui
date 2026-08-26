/**
 * `@zanix/space-ui` — a small, framework-agnostic-where-possible component library for apps built
 * on `@zanix/space`. Every component exported from HERE (the default, `.` entrypoint) takes
 * already-resolved data (URLs, labels, viewBox) as props — none of them resolves assets, translates
 * strings, or reaches into `@zanix/space`'s own conventions itself, and none of them has a runtime
 * dependency on `@zanix/space`. That split keeps this package usable on its own terms, versioned
 * independently from the rendering engine it's meant to sit on top of.
 *
 * Six components — `Video`, `Image`, `RichText`, `ImgButton`, `Card`, `Menu` — DO have a real,
 * direct-or-composed runtime dependency on `@zanix/space` (its own `resolveAssetHref`, from
 * `@zanix/space/assets-manifest`), and are exported from `./runtime` instead (`./runtime/preact`
 * for the Preact bindings) — never from here. A barrel export forces resolution of every module it
 * re-exports together, so keeping these six here would force resolution of the ENTIRE barrel —
 * including these six — the moment a consumer imports even one unrelated component (e.g. `Button`,
 * which has zero `@zanix/space` dependency), pulling `@zanix/space` back into the graph and
 * creating a genuine circular resolution whenever `@zanix/space`'s own build pipeline resolves a
 * `@zanix/space-ui` import (confirmed to hang `@deno/loader`'s native workspace resolution in a
 * real `zanix space build`). See `runtime.ts`'s own `@module` doc for the full reasoning and the
 * exact composition chain behind each of the six.
 *
 * @module
 */

export { Icon } from 'components/Icon/index.ts'
export type { IconProps } from 'components/Icon/types.ts'

// `CatalogIcon` is a thin resolver over `Icon` above, never a second icon system — see its own
// module doc.
export { CatalogIcon } from 'components/CatalogIcon/index.ts'
export { CATALOG_VIEWBOX } from 'components/CatalogIcon/types.ts'
export type {
  CatalogIconName,
  CatalogIconProps,
  IconCatalogProps,
} from 'components/CatalogIcon/types.ts'
// Renderer-agnostic (parametrized by `h`, not bound to one) — same export in both entrypoints,
// not a per-renderer binding like `CatalogIcon` above. Lets a consumer build their own
// `CatalogIcon`-shaped component over their own name→viewBox map — see `render.ts`'s own doc
// ("When to reach for this directly") for the full use case and a worked example.
export { createCatalogIcon } from 'components/CatalogIcon/render.ts'
// Needed to type a custom `h`/`createElement` binding passed to `createCatalogIcon` above —
// see `typings/renderer.ts`'s own doc.
export type { CreateElement } from 'typings/renderer.ts'

export { IFrame } from 'components/IFrame/index.ts'
export type { IFrameProps } from 'components/IFrame/types.ts'

export { ProgressBar } from 'components/ProgressBar/index.ts'
export type { ProgressBarProps } from 'components/ProgressBar/types.ts'

export { Grid, GridItem } from 'components/Grid/index.ts'
export type { GridItemProps, GridProps, TemplateArea } from 'components/Grid/types.ts'

export { Button } from 'components/Button/index.ts'
export type { BaseButtonProps, ButtonProps, CheckedButtonRole } from 'components/Button/types.ts'

export { Link } from 'components/Link/index.ts'
export type { LinkProps } from 'components/Link/types.ts'

export { Counter } from 'components/Counter/index.ts'
export type { CounterProps } from 'components/Counter/types.ts'

export { Slider } from 'components/Slider/index.ts'
export type { SliderProps } from 'components/Slider/index.ts'
export type { SliderBaseProps } from 'components/Slider/types.ts'

export { Modal, ModalProvider, useModal } from 'components/Modal/index.ts'
export type { ModalProps, ModalStackApi } from 'components/Modal/index.ts'
export type { ModalAccessibleName, ModalBaseProps, ModalPosition } from 'components/Modal/types.ts'

export { Disclosure } from 'components/Disclosure/index.ts'
export type { DisclosureProps } from 'components/Disclosure/index.ts'
export type { DisclosureBaseProps } from 'components/Disclosure/types.ts'

export { Accordion } from 'components/Accordion/index.ts'
export type { AccordionItem, AccordionProps } from 'components/Accordion/index.ts'
export type { AccordionBaseProps, AccordionItemBase } from 'components/Accordion/types.ts'

export { RadioGroup } from 'components/RadioGroup/index.ts'
export type { RadioGroupItem, RadioGroupProps } from 'components/RadioGroup/index.ts'
export type { RadioGroupBaseProps, RadioGroupItemBase } from 'components/RadioGroup/types.ts'

export { Tabs } from 'components/Tabs/index.ts'
export type { TabItem, TabsProps } from 'components/Tabs/index.ts'
export type { TabItemBase, TabsBaseProps } from 'components/Tabs/types.ts'

export { VisuallyHidden } from 'components/VisuallyHidden/index.ts'
export type { VisuallyHiddenProps } from 'components/VisuallyHidden/types.ts'

export { Alert } from 'components/Alert/index.ts'
export type { AlertProps } from 'components/Alert/types.ts'

export { Pagination } from 'components/Pagination/index.ts'
export type { PaginationProps } from 'components/Pagination/index.ts'
export type { PaginationBaseProps } from 'components/Pagination/types.ts'

export { Skeleton } from 'components/Skeleton/index.ts'
export type { SkeletonProps } from 'components/Skeleton/types.ts'

export { Drawer } from 'components/Drawer/index.ts'
export type { DrawerProps } from 'components/Drawer/index.ts'
export type { DrawerAccessibleName, DrawerBaseProps, DrawerSide } from 'components/Drawer/types.ts'

export { Field } from 'components/Field/index.ts'
export type { FieldProps } from 'components/Field/index.ts'
export type { FieldBaseProps, FieldRenderProps } from 'components/Field/types.ts'

export { Input } from 'components/Input/index.ts'
export type { InputProps } from 'components/Input/index.ts'
export type { InputBaseProps, InputType } from 'components/Input/types.ts'

export { FileInput } from 'components/FileInput/index.ts'
export type { FileInputProps } from 'components/FileInput/index.ts'
export type { FileInputBaseProps } from 'components/FileInput/types.ts'

export { ToastProvider, useToast } from 'components/Toast/index.ts'
export type { ToastApi } from 'components/Toast/index.ts'
export type {
  ToastMessage,
  ToastMessageBase,
  ToastPosition,
  ToastVariant,
} from 'components/Toast/types.ts'

export { Showcase } from 'components/Showcase/index.ts'
export type { ShowcaseProps } from 'components/Showcase/index.ts'
export type { ItemsPerSlide, ShowcaseBaseProps } from 'components/Showcase/types.ts'

export { Popover } from 'components/Popover/index.ts'
export type { PopoverProps } from 'components/Popover/index.ts'
export type { PopoverBaseProps, PopoverTriggerRenderProps } from 'components/Popover/types.ts'

export { Tooltip } from 'components/Tooltip/index.ts'
export type { TooltipProps } from 'components/Tooltip/index.ts'
export type { TooltipBaseProps, TooltipTriggerRenderProps } from 'components/Tooltip/types.ts'

export { Combobox } from 'components/Combobox/index.ts'
export type { ComboboxProps } from 'components/Combobox/index.ts'
export type { ComboboxBaseProps, ComboboxOption } from 'components/Combobox/types.ts'

export { Select } from 'components/Select/index.ts'
export type { SelectProps } from 'components/Select/index.ts'
export type { SelectBaseProps, SelectOption } from 'components/Select/types.ts'

export { SocialNetworks } from 'components/SocialNetworks/index.ts'
export type {
  SocialNetworkIcon,
  SocialNetworkLink,
  SocialNetworkLogo,
  SocialNetworksProps,
} from 'components/SocialNetworks/types.ts'

// `StructuredData`/`StructuredDataProps`/`resolveStructuredData` reference `schema-dts`'s own
// `Thing`/`WithContext` in their public signature (and `Icon`/`SocialNetworks`/`StructuredData`'s
// Preact bindings reference Preact's own `VNode`) — JSR's slow-types checker wants every type
// reachable from a public export
// to itself be re-exported, but `Thing` alone cascades into 13 more schema.org vendor types, and
// `VNode` cascades similarly into Preact's own internals. Re-exporting that whole vendor type graph
// into this package's own public surface would bloat it with types this package doesn't own or
// version, working against its own "small and focused" design principle — accepted as a known,
// deliberate trade-off (this package still publishes and works correctly; only JSR's fast
// pre-computed type inference for these specific signatures is unavailable, full inference
// still works for any consumer).
export { StructuredData } from 'components/StructuredData/index.ts'
export type { StructuredDataProps } from 'components/StructuredData/types.ts'
// Renderer-agnostic — no `h`/`createElement` involved — so this is the same export in both
// entrypoints, not one per renderer like the components above.
export { resolveStructuredData } from 'components/StructuredData/resolve.ts'
export { escapeJsonLd } from 'components/StructuredData/render.ts'

export { createFormatter, IntlProvider, useIntl } from 'intl/index.ts'
export type {
  FormatMessageValues,
  Formatter,
  IntlProviderProps,
  Messages as IntlMessages,
  RichTextTagFn,
} from 'intl/index.ts'

// --- Captcha ---------------------------------------------------------------------------------
// Three separate components, not one with a `provider` prop — each provider ships its own real
// client-side JS runtime, so a consumer using only one never pulls the other two providers' glue
// code into their bundle. The client-side complement to `@zanix/auth`'s own `captchaGuard` — this
// package never imports anything from `@zanix/auth`; see each component's own doc for the CSP
// gotcha in a `@zanix/space` app and a real end-to-end usage example.

// Renderer-agnostic — no `h`/`createElement` involved — so this is the same export in both
// entrypoints, not one per renderer like the components below.
export type { CaptchaWidgetSize, TurnstileAppearance } from 'shared/captcha-types.ts'

export { Recaptcha } from 'components/Recaptcha/index.ts'
export type { RecaptchaProps } from 'components/Recaptcha/types.ts'

export { HCaptcha } from 'components/HCaptcha/index.ts'
export type { HCaptchaProps } from 'components/HCaptcha/types.ts'

export { Turnstile } from 'components/Turnstile/index.ts'
export type { TurnstileProps } from 'components/Turnstile/types.ts'

// The only genuinely new component `@zanix/console`'s architecture requires — a headless
// `<table>` over caller-resolved `columns`/`rows`, controlled `sort`/`onSortChange` and
// `getRowHref` mirroring `Pagination`'s own `page`/`onPageChange`/`getPageHref` shape exactly.
export { Table } from 'components/Table/index.ts'
export type {
  TableColumn,
  TableProps,
  TableSort,
  TableSortDirection,
} from 'components/Table/index.ts'
export type { TableBaseProps, TableColumnBase } from 'components/Table/types.ts'

// --- Shared primitives ---------------------------------------------------------------------
// The same headless building blocks this package's own interactive components (`Modal`, `Menu`,
// `Slider`, `Popover`, `Tooltip`, `Combobox`, `RadioGroup`, `Tabs`) are built from, exported here
// so a consumer app doesn't have to reimplement them from scratch either.

export { useCloseOnOutside } from 'shared/close-on-outside.ts'

export { createEscapeToCloseHandler } from 'shared/escape-to-close.ts'
export type { EscapeKeyEvent } from 'shared/escape-to-close.ts'

export { FOCUSABLE_SELECTOR, useFocusScope } from 'shared/focus-scope.ts'
export type { FocusScopeOptions, TabKeyEvent } from 'shared/focus-scope.ts'

export { liveRegionProps, VISUALLY_HIDDEN_STYLE } from 'shared/live-region.ts'
export type { LiveRegionPoliteness } from 'shared/live-region.ts'

export { createRovingKeyDownHandler, getNextRovingIndex } from 'shared/roving-focus.ts'
export type { NavigationKeyEvent, RovingFocusOrientation } from 'shared/roving-focus.ts'

// `Popover`/`Tooltip`/`Combobox` are `usePosition`'s three real consumers — this is
// the geometry + DOM-measurement engine underneath it.
export { computePosition } from 'shared/positioning.ts'
export type {
  Alignment,
  ComputePositionOptions,
  ComputePositionResult,
  Placement,
  Rect,
  Side,
  Size,
} from 'shared/positioning.ts'
export { autoUpdate, getViewportRect, measurePosition } from 'shared/positioning-dom.ts'
export { usePosition } from 'shared/use-position.ts'
