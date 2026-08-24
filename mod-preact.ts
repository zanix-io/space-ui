/**
 * `@zanix/space-ui`'s Preact-bound components — same props, same rendered markup as the default
 * (React) entrypoint. Import from here instead of `.` when your `@zanix/space` app uses
 * `--renderer=preact`. See the default entrypoint's own `@module` doc for the package's overall
 * design principle.
 *
 * @module
 */

export { Icon } from 'components/Icon/index.preact.ts'
export type {
  /** See `components/Icon/types.ts`'s own `IconProps` for the full doc. */
  IconProps,
} from 'components/Icon/types.ts'

// See the default entrypoint's own comment on `CatalogIcon` — same reasoning, Preact binding.
export { CatalogIcon } from 'components/CatalogIcon/index.preact.ts'
export {
  /** See `components/CatalogIcon/types.ts`'s own `CATALOG_VIEWBOX` for the full doc. */
  CATALOG_VIEWBOX,
} from 'components/CatalogIcon/types.ts'
export type {
  /** See `components/CatalogIcon/types.ts`'s own `CatalogIconName` for the full doc. */
  CatalogIconName,
  /** See `components/CatalogIcon/types.ts`'s own `CatalogIconProps` for the full doc. */
  CatalogIconProps,
  /** See `components/CatalogIcon/types.ts`'s own `IconCatalogProps` for the full doc. */
  IconCatalogProps,
} from 'components/CatalogIcon/types.ts'
// Renderer-agnostic — same export as the default entrypoint, not a Preact-specific binding. See
// that file's own comment for the full reasoning.
export {
  /** See `components/CatalogIcon/render.ts`'s own `createCatalogIcon` for the full doc. */
  createCatalogIcon,
} from 'components/CatalogIcon/render.ts'
export type {
  /** See `typings/renderer.ts`'s own `CreateElement` for the full doc. */
  CreateElement,
} from 'typings/renderer.ts'

export { IFrame } from 'components/IFrame/index.preact.ts'
export type {
  /** See `components/IFrame/types.ts`'s own `IFrameProps` for the full doc. */
  IFrameProps,
} from 'components/IFrame/types.ts'

export { Video } from 'components/Video/index.preact.ts'
export type {
  /** See `components/Video/types.ts`'s own `VideoProps` for the full doc. */
  VideoProps,
  /** See `components/Video/types.ts`'s own `VideoSourceProps` for the full doc. */
  VideoSourceProps,
  /** See `components/Video/types.ts`'s own `VideoTrackProps` for the full doc. */
  VideoTrackProps,
} from 'components/Video/types.ts'

export { Image } from 'components/Image/index.preact.ts'
export type {
  /** See `components/Image/types.ts`'s own `ImageProps` for the full doc. */
  ImageProps,
  /** See `components/Image/types.ts`'s own `ImageSourceProps` for the full doc. */
  ImageSourceProps,
} from 'components/Image/types.ts'

export { ProgressBar } from 'components/ProgressBar/index.preact.ts'
export type {
  /** See `components/ProgressBar/types.ts`'s own `ProgressBarProps` for the full doc. */
  ProgressBarProps,
} from 'components/ProgressBar/types.ts'

export { Grid, GridItem } from 'components/Grid/index.preact.ts'
export type {
  /** See `components/Grid/types.ts`'s own `GridItemProps` for the full doc. */
  GridItemProps,
  /** See `components/Grid/types.ts`'s own `GridProps` for the full doc. */
  GridProps,
  /** See `components/Grid/types.ts`'s own `TemplateArea` for the full doc. */
  TemplateArea,
} from 'components/Grid/types.ts'

export { Card } from 'components/Card/index.preact.ts'
export type {
  /** See `components/Card/types.ts`'s own `CardImageProps` for the full doc. */
  CardImageProps,
  /** See `components/Card/types.ts`'s own `CardProps` for the full doc. */
  CardProps,
} from 'components/Card/types.ts'

export { Button } from 'components/Button/index.preact.ts'
export type {
  /** See `components/Button/types.ts`'s own `BaseButtonProps` for the full doc. */
  BaseButtonProps,
  /** See `components/Button/types.ts`'s own `ButtonProps` for the full doc. */
  ButtonProps,
  /** See `components/Button/types.ts`'s own `CheckedButtonRole` for the full doc. */
  CheckedButtonRole,
} from 'components/Button/types.ts'

export { Link } from 'components/Link/index.preact.ts'
export type {
  /** See `components/Link/types.ts`'s own `LinkProps` for the full doc. */
  LinkProps,
} from 'components/Link/types.ts'

export { ImgButton } from 'components/ImgButton/index.preact.ts'
export type {
  /** See `components/ImgButton/types.ts`'s own `ImgButtonProps` for the full doc. */
  ImgButtonProps,
} from 'components/ImgButton/types.ts'

export { Counter } from 'components/Counter/index.preact.ts'
export type {
  /** See `components/Counter/types.ts`'s own `CounterProps` for the full doc. */
  CounterProps,
} from 'components/Counter/types.ts'

export { Menu } from 'components/Menu/index.preact.ts'
export type {
  /** See `components/Menu/types.ts`'s own `MenuItem` for the full doc. */
  MenuItem,
  /** See `components/Menu/types.ts`'s own `MenuOpenMode` for the full doc. */
  MenuOpenMode,
  /** See `components/Menu/types.ts`'s own `MenuProps` for the full doc. */
  MenuProps,
} from 'components/Menu/types.ts'

export { Slider } from 'components/Slider/index.preact.ts'
export type { SliderProps } from 'components/Slider/index.preact.ts'
export type {
  /** See `components/Slider/types.ts`'s own `SliderBaseProps` for the full doc. */
  SliderBaseProps,
} from 'components/Slider/types.ts'

export { Modal, ModalProvider, useModal } from 'components/Modal/index.preact.ts'
export type { ModalProps, ModalStackApi } from 'components/Modal/index.preact.ts'
export type {
  /** See `components/Modal/types.ts`'s own `ModalAccessibleName` for the full doc. */
  ModalAccessibleName,
  /** See `components/Modal/types.ts`'s own `ModalBaseProps` for the full doc. */
  ModalBaseProps,
  /** See `components/Modal/types.ts`'s own `ModalPosition` for the full doc. */
  ModalPosition,
} from 'components/Modal/types.ts'

export { Disclosure } from 'components/Disclosure/index.preact.ts'
export type { DisclosureProps } from 'components/Disclosure/index.preact.ts'
export type {
  /** See `components/Disclosure/types.ts`'s own `DisclosureBaseProps` for the full doc. */
  DisclosureBaseProps,
} from 'components/Disclosure/types.ts'

export { Accordion } from 'components/Accordion/index.preact.ts'
export type { AccordionItem, AccordionProps } from 'components/Accordion/index.preact.ts'
export type {
  /** See `components/Accordion/types.ts`'s own `AccordionBaseProps` for the full doc. */
  AccordionBaseProps,
  /** See `components/Accordion/types.ts`'s own `AccordionItemBase` for the full doc. */
  AccordionItemBase,
} from 'components/Accordion/types.ts'

export { RadioGroup } from 'components/RadioGroup/index.preact.ts'
export type { RadioGroupItem, RadioGroupProps } from 'components/RadioGroup/index.preact.ts'
export type {
  /** See `components/RadioGroup/types.ts`'s own `RadioGroupBaseProps` for the full doc. */
  RadioGroupBaseProps,
  /** See `components/RadioGroup/types.ts`'s own `RadioGroupItemBase` for the full doc. */
  RadioGroupItemBase,
} from 'components/RadioGroup/types.ts'

export { Tabs } from 'components/Tabs/index.preact.ts'
export type { TabItem, TabsProps } from 'components/Tabs/index.preact.ts'
export type {
  /** See `components/Tabs/types.ts`'s own `TabItemBase` for the full doc. */
  TabItemBase,
  /** See `components/Tabs/types.ts`'s own `TabsBaseProps` for the full doc. */
  TabsBaseProps,
} from 'components/Tabs/types.ts'

export { VisuallyHidden } from 'components/VisuallyHidden/index.preact.ts'
export type {
  /** See `components/VisuallyHidden/types.ts`'s own `VisuallyHiddenProps` for the full doc. */
  VisuallyHiddenProps,
} from 'components/VisuallyHidden/types.ts'

export { Alert } from 'components/Alert/index.preact.ts'
export type {
  /** See `components/Alert/types.ts`'s own `AlertProps` for the full doc. */
  AlertProps,
} from 'components/Alert/types.ts'

export { Pagination } from 'components/Pagination/index.preact.ts'
export type { PaginationProps } from 'components/Pagination/index.preact.ts'
export type {
  /** See `components/Pagination/types.ts`'s own `PaginationBaseProps` for the full doc. */
  PaginationBaseProps,
} from 'components/Pagination/types.ts'

export { Skeleton } from 'components/Skeleton/index.preact.ts'
export type {
  /** See `components/Skeleton/types.ts`'s own `SkeletonProps` for the full doc. */
  SkeletonProps,
} from 'components/Skeleton/types.ts'

export { Drawer } from 'components/Drawer/index.preact.ts'
export type { DrawerProps } from 'components/Drawer/index.preact.ts'
export type {
  /** See `components/Drawer/types.ts`'s own `DrawerAccessibleName` for the full doc. */
  DrawerAccessibleName,
  /** See `components/Drawer/types.ts`'s own `DrawerBaseProps` for the full doc. */
  DrawerBaseProps,
  /** See `components/Drawer/types.ts`'s own `DrawerSide` for the full doc. */
  DrawerSide,
} from 'components/Drawer/types.ts'

export { Field } from 'components/Field/index.preact.ts'
export type { FieldProps } from 'components/Field/index.preact.ts'
export type {
  /** See `components/Field/types.ts`'s own `FieldBaseProps` for the full doc. */
  FieldBaseProps,
  /** See `components/Field/types.ts`'s own `FieldRenderProps` for the full doc. */
  FieldRenderProps,
} from 'components/Field/types.ts'

export { Input } from 'components/Input/index.preact.ts'
export type { InputProps } from 'components/Input/index.preact.ts'
export type {
  /** See `components/Input/types.ts`'s own `InputBaseProps` for the full doc. */
  InputBaseProps,
  /** See `components/Input/types.ts`'s own `InputType` for the full doc. */
  InputType,
} from 'components/Input/types.ts'

export { FileInput } from 'components/FileInput/index.preact.ts'
export type { FileInputProps } from 'components/FileInput/index.preact.ts'
export type {
  /** See `components/FileInput/types.ts`'s own `FileInputBaseProps` for the full doc. */
  FileInputBaseProps,
} from 'components/FileInput/types.ts'

export { ToastProvider, useToast } from 'components/Toast/index.preact.ts'
export type { ToastApi } from 'components/Toast/index.preact.ts'
export type {
  /** See `components/Toast/types.ts`'s own `ToastMessage` for the full doc. */
  ToastMessage,
  /** See `components/Toast/types.ts`'s own `ToastMessageBase` for the full doc. */
  ToastMessageBase,
  /** See `components/Toast/types.ts`'s own `ToastPosition` for the full doc. */
  ToastPosition,
  /** See `components/Toast/types.ts`'s own `ToastVariant` for the full doc. */
  ToastVariant,
} from 'components/Toast/types.ts'

export { Showcase } from 'components/Showcase/index.preact.ts'
export type { ShowcaseProps } from 'components/Showcase/index.preact.ts'
export type {
  /** See `components/Showcase/types.ts`'s own `ItemsPerSlide` for the full doc. */
  ItemsPerSlide,
  /** See `components/Showcase/types.ts`'s own `ShowcaseBaseProps` for the full doc. */
  ShowcaseBaseProps,
} from 'components/Showcase/types.ts'

export { Popover } from 'components/Popover/index.preact.ts'
export type { PopoverProps } from 'components/Popover/index.preact.ts'
export type {
  /** See `components/Popover/types.ts`'s own `PopoverBaseProps` for the full doc. */
  PopoverBaseProps,
  /** See `components/Popover/types.ts`'s own `PopoverTriggerRenderProps` for the full doc. */
  PopoverTriggerRenderProps,
} from 'components/Popover/types.ts'

export { Tooltip } from 'components/Tooltip/index.preact.ts'
export type { TooltipProps } from 'components/Tooltip/index.preact.ts'
export type {
  /** See `components/Tooltip/types.ts`'s own `TooltipBaseProps` for the full doc. */
  TooltipBaseProps,
  /** See `components/Tooltip/types.ts`'s own `TooltipTriggerRenderProps` for the full doc. */
  TooltipTriggerRenderProps,
} from 'components/Tooltip/types.ts'

export { Combobox } from 'components/Combobox/index.preact.ts'
export type { ComboboxProps } from 'components/Combobox/index.preact.ts'
export type {
  /** See `components/Combobox/types.ts`'s own `ComboboxBaseProps` for the full doc. */
  ComboboxBaseProps,
  /** See `components/Combobox/types.ts`'s own `ComboboxOption` for the full doc. */
  ComboboxOption,
} from 'components/Combobox/types.ts'

export { Select } from 'components/Select/index.preact.ts'
export type { SelectProps } from 'components/Select/index.preact.ts'
export type {
  /** See `components/Select/types.ts`'s own `SelectBaseProps` for the full doc. */
  SelectBaseProps,
  /** See `components/Select/types.ts`'s own `SelectOption` for the full doc. */
  SelectOption,
} from 'components/Select/types.ts'

export { RichText } from 'components/RichText/index.preact.ts'
export type { RichTextProps } from 'components/RichText/index.preact.ts'
export type {
  /** See `components/RichText/types.ts`'s own `RichTextBaseProps` for the full doc. */
  RichTextBaseProps,
  /** See `components/RichText/types.ts`'s own `RichTextContentFormat` for the full doc. */
  RichTextContentFormat,
} from 'components/RichText/types.ts'
export {
  /** See `components/RichText/resolve.ts`'s own `resolveRichTextDocument` for the full doc. */
  resolveRichTextDocument,
} from 'components/RichText/resolve.ts'
export type {
  /** See `components/RichText/resolve.ts`'s own `ResolveRichTextDocumentOptions` for the full doc. */
  ResolveRichTextDocumentOptions,
} from 'components/RichText/resolve.ts'
export {
  /** See `components/RichText/props-sentinel.ts`'s own `extractRichTextProps` for the full doc. */
  extractRichTextProps,
} from 'components/RichText/props-sentinel.ts'

export { SocialNetworks } from 'components/SocialNetworks/index.preact.ts'
export type {
  /** See `components/SocialNetworks/types.ts`'s own `SocialNetworkIcon` for the full doc. */
  SocialNetworkIcon,
  /** See `components/SocialNetworks/types.ts`'s own `SocialNetworkLink` for the full doc. */
  SocialNetworkLink,
  /** See `components/SocialNetworks/types.ts`'s own `SocialNetworkLogo` for the full doc. */
  SocialNetworkLogo,
  /** See `components/SocialNetworks/types.ts`'s own `SocialNetworksProps` for the full doc. */
  SocialNetworksProps,
} from 'components/SocialNetworks/types.ts'

// See the default entrypoint's own comment on `StructuredData` for why this subpath, and the
// Preact `VNode` return type every binding here has, are accepted slow-types exceptions.
export { StructuredData } from 'components/StructuredData/index.preact.ts'
export type {
  /** See `components/StructuredData/types.ts`'s own `StructuredDataProps` for the full doc. */
  StructuredDataProps,
} from 'components/StructuredData/types.ts'
// Renderer-agnostic — same export as the default entrypoint, not a Preact-specific binding.
export {
  /** See `components/StructuredData/resolve.ts`'s own `resolveStructuredData` for the full doc. */
  resolveStructuredData,
} from 'components/StructuredData/resolve.ts'
export {
  /** See `components/StructuredData/render.ts`'s own `escapeJsonLd` for the full doc. */
  escapeJsonLd,
} from 'components/StructuredData/render.ts'

export {
  /** See `intl/formatter.ts`'s own `createFormatter` for the full doc. */
  createFormatter,
  IntlProvider,
  useIntl,
} from 'intl/index.preact.ts'
export type {
  /** See `intl/formatter.ts`'s own `FormatMessageValues` for the full doc. */
  FormatMessageValues,
  /** See `intl/formatter.ts`'s own `Formatter` for the full doc. */
  Formatter,
  IntlProviderProps,
  /** See `intl/formatter.ts`'s own `Messages` for the full doc. */
  Messages as IntlMessages,
  /** See `intl/formatter.ts`'s own `RichTextTagFn` for the full doc. */
  RichTextTagFn,
} from 'intl/index.preact.ts'

// --- Captcha ---------------------------------------------------------------------------------
// See the default entrypoint's own comment on this section — same reasoning, independent Preact
// implementations (real interactive state, never a shared `render.ts` factory).

export type {
  /** See `shared/captcha-types.ts`'s own `CaptchaWidgetSize` for the full doc. */
  CaptchaWidgetSize,
  /** See `shared/captcha-types.ts`'s own `TurnstileAppearance` for the full doc. */
  TurnstileAppearance,
} from 'shared/captcha-types.ts'

export { Recaptcha } from 'components/Recaptcha/index.preact.ts'
export type {
  /** See `components/Recaptcha/types.ts`'s own `RecaptchaProps` for the full doc. */
  RecaptchaProps,
} from 'components/Recaptcha/types.ts'

export { HCaptcha } from 'components/HCaptcha/index.preact.ts'
export type {
  /** See `components/HCaptcha/types.ts`'s own `HCaptchaProps` for the full doc. */
  HCaptchaProps,
} from 'components/HCaptcha/types.ts'

export { Turnstile } from 'components/Turnstile/index.preact.ts'
export type {
  /** See `components/Turnstile/types.ts`'s own `TurnstileProps` for the full doc. */
  TurnstileProps,
} from 'components/Turnstile/types.ts'

// The only genuinely new component `@zanix/console`'s architecture requires — a headless
// `<table>` over caller-resolved `columns`/`rows`, controlled `sort`/`onSortChange` and
// `getRowHref` mirroring `Pagination`'s own `page`/`onPageChange`/`getPageHref` shape exactly.
export { Table } from 'components/Table/index.preact.ts'
export type {
  TableColumn,
  TableProps,
  TableSort,
  TableSortDirection,
} from 'components/Table/index.preact.ts'
export type {
  /** See `components/Table/types.ts`'s own `TableBaseProps`/`TableColumnBase` for the full doc. */
  TableBaseProps,
  TableColumnBase,
} from 'components/Table/types.ts'

// --- Shared primitives ---------------------------------------------------------------------
// See the default entrypoint's own comment on this section — same reasoning, Preact bindings for
// the two that are hooks (`useCloseOnOutside`, `useFocusScope`); the rest are renderer-agnostic and
// re-export the identical module.

export { useCloseOnOutside } from 'shared/close-on-outside.preact.ts'

export {
  /** See `shared/escape-to-close.ts`'s own `createEscapeToCloseHandler` for the full doc. */
  createEscapeToCloseHandler,
} from 'shared/escape-to-close.ts'
export type {
  /** See `shared/escape-to-close.ts`'s own `EscapeKeyEvent` for the full doc. */
  EscapeKeyEvent,
} from 'shared/escape-to-close.ts'

export { FOCUSABLE_SELECTOR, useFocusScope } from 'shared/focus-scope.preact.ts'
export type { FocusScopeOptions, TabKeyEvent } from 'shared/focus-scope.preact.ts'

export {
  /** See `shared/live-region.ts`'s own `liveRegionProps` for the full doc. */
  liveRegionProps,
  /** See `shared/live-region.ts`'s own `VISUALLY_HIDDEN_STYLE` for the full doc. */
  VISUALLY_HIDDEN_STYLE,
} from 'shared/live-region.ts'
export type {
  /** See `shared/live-region.ts`'s own `LiveRegionPoliteness` for the full doc. */
  LiveRegionPoliteness,
} from 'shared/live-region.ts'

export {
  /** See `shared/roving-focus.ts`'s own `createRovingKeyDownHandler` for the full doc. */
  createRovingKeyDownHandler,
  /** See `shared/roving-focus.ts`'s own `getNextRovingIndex` for the full doc. */
  getNextRovingIndex,
} from 'shared/roving-focus.ts'
export type {
  /** See `shared/roving-focus.ts`'s own `NavigationKeyEvent` for the full doc. */
  NavigationKeyEvent,
  /** See `shared/roving-focus.ts`'s own `RovingFocusOrientation` for the full doc. */
  RovingFocusOrientation,
} from 'shared/roving-focus.ts'

export {
  /** See `shared/positioning.ts`'s own `computePosition` for the full doc. */
  computePosition,
} from 'shared/positioning.ts'
export type {
  /** See `shared/positioning.ts`'s own `Alignment` for the full doc. */
  Alignment,
  /** See `shared/positioning.ts`'s own `ComputePositionOptions` for the full doc. */
  ComputePositionOptions,
  /** See `shared/positioning.ts`'s own `ComputePositionResult` for the full doc. */
  ComputePositionResult,
  /** See `shared/positioning.ts`'s own `Placement` for the full doc. */
  Placement,
  /** See `shared/positioning.ts`'s own `Rect` for the full doc. */
  Rect,
  /** See `shared/positioning.ts`'s own `Side` for the full doc. */
  Side,
  /** See `shared/positioning.ts`'s own `Size` for the full doc. */
  Size,
} from 'shared/positioning.ts'
export {
  /** See `shared/positioning-dom.ts`'s own `autoUpdate` for the full doc. */
  autoUpdate,
  /** See `shared/positioning-dom.ts`'s own `getViewportRect` for the full doc. */
  getViewportRect,
  /** See `shared/positioning-dom.ts`'s own `measurePosition` for the full doc. */
  measurePosition,
} from 'shared/positioning-dom.ts'
export { usePosition } from 'shared/use-position.preact.ts'
