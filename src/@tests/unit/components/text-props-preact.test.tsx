import './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { defineTextPropTests } from './text-props-cases.ts'
import { ToastProvider, useToast } from 'components/Toast/index.preact.ts'
import { Modal } from 'components/Modal/index.preact.ts'
import { Menu } from 'components/Menu/index.preact.ts'
import { Slider } from 'components/Slider/index.preact.ts'
import { DatePicker } from 'components/DatePicker/index.preact.ts'
import { SocialLinksInput } from 'components/SocialLinksInput/index.preact.ts'
import { SocialNetworks } from 'components/SocialNetworks/index.preact.ts'

defineTextPropTests('Preact', {
  // deno-lint-ignore no-explicit-any
  create: h as any,
  mount: (node) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    // deno-lint-ignore no-explicit-any
    act(() => renderDOM(node as any, container))
    return { container, unmount: () => act(() => renderDOM(null, container)) }
  },
  act: (work) => act(work),
  // deno-lint-ignore no-explicit-any
  renderToString: (node) => renderToString(node as any),
  Toast: { ToastProvider, useToast },
  Modal,
  Menu,
  Slider,
  DatePicker,
  SocialLinksInput,
  SocialNetworks,
})
