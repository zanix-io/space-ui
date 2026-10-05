import './dom-test-setup.ts'
import { act } from 'react'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { defineTextPropTests } from './text-props-cases.ts'
import { ToastProvider, useToast } from 'components/Toast/index.ts'
import { Modal } from 'components/Modal/index.ts'
import { Menu } from 'components/Menu/index.ts'
import { Slider } from 'components/Slider/index.ts'
import { DatePicker } from 'components/DatePicker/index.ts'
import { SocialLinksInput } from 'components/SocialLinksInput/index.ts'
import { SocialNetworks } from 'components/SocialNetworks/index.ts'

defineTextPropTests('React', {
  // deno-lint-ignore no-explicit-any
  create: createElement as any,
  mount: (node) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    // deno-lint-ignore no-explicit-any
    act(() => root.render(node as any))
    return { container, unmount: () => act(() => root.unmount()) }
  },
  act: (work) => act(work),
  // deno-lint-ignore no-explicit-any
  renderToString: (node) => renderToStaticMarkup(node as any),
  Toast: { ToastProvider, useToast },
  Modal,
  Menu,
  Slider,
  DatePicker,
  SocialLinksInput,
  SocialNetworks,
})
