import { must } from './dom-test-setup.ts'
import { assert, assertEquals } from '@std/assert'

// Every visible/accessible text a component renders itself is a string prop with an English
// default; nothing is translated here. The same cases run against the React and the Preact
// binding (text-props.test.tsx / text-props-preact.test.tsx), so the two stay identical.

// deno-lint-ignore no-explicit-any
type Any = any

export type TextPropsBinding = {
  /** Builds an element of the binding's renderer. */
  create: (type: Any, props: Record<string, unknown> | null, ...children: unknown[]) => unknown
  /** Renders into a fresh container inside the renderer's own act(). */
  mount: (node: unknown) => { container: HTMLElement; unmount: () => void }
  /** Runs `work` inside the renderer's own act(). */
  act: (work: () => void) => void
  /** Server-renders to static markup (no effects). */
  renderToString: (node: unknown) => string
  Toast: { ToastProvider: Any; useToast: () => Any }
  Modal: Any
  Menu: Any
  Slider: Any
  DatePicker: Any
  SocialLinksInput: Any
  SocialNetworks: Any
}

function labels(root: ParentNode): string[] {
  return [...root.querySelectorAll('[aria-label]')].map((el) => el.getAttribute('aria-label') ?? '')
}

export function defineTextPropTests(name: string, b: TextPropsBinding): void {
  const t = (title: string, run: () => void) => Deno.test(`${name} text props: ${title}`, run)

  function withMounted(node: unknown, run: (container: HTMLElement) => void) {
    const { container, unmount } = b.mount(node)
    try {
      run(container)
    } finally {
      unmount()
    }
  }

  // --- Toast ---------------------------------------------------------------------------------

  function toastCloseLabel(
    providerProps: Record<string, unknown>,
    message: Record<string, unknown>,
  ) {
    let api!: ReturnType<typeof b.Toast.useToast>
    function Trigger() {
      api = b.Toast.useToast()
      return null
    }
    let result = ''
    withMounted(
      b.create(b.Toast.ToastProvider, providerProps, b.create(Trigger, null)),
      (container) => {
        b.act(() => api.showToast({ title: 'Saved', ...message }))
        result = must(container.querySelector('[data-space-ui="toast"] button')).getAttribute(
          'aria-label',
        ) ?? ''
      },
    )
    return result
  }

  t('Toast close defaults to English, provider prop and per-toast prop override', () => {
    assertEquals(toastCloseLabel({}, {}), 'Close')
    assertEquals(toastCloseLabel({ closeLabel: 'Cerrar' }, {}), 'Cerrar')
    assertEquals(
      toastCloseLabel({ closeLabel: 'Cerrar' }, { closeLabel: 'Descartar' }),
      'Descartar',
    )
  })

  // --- Modal ---------------------------------------------------------------------------------

  function modalCloseLabel(extra: Record<string, unknown>): string {
    let result = ''
    withMounted(
      b.create(b.Modal, { open: true, onClose: () => {}, label: 'Dialog', ...extra }, 'body'),
      (container) => {
        result = must(container.querySelector('[data-space-ui="modal"] button')).getAttribute(
          'aria-label',
        ) ?? ''
      },
    )
    return result
  }

  t('Modal close defaults to English and closeLabel wins', () => {
    assertEquals(modalCloseLabel({}), 'Close')
    assertEquals(modalCloseLabel({ closeLabel: 'Cerrar' }), 'Cerrar')
  })

  // --- Menu ----------------------------------------------------------------------------------

  const menuItems = [
    { label: 'Shop', url: '/shop', submenu: [{ label: 'Hats', url: '/hats' }] },
    { label: 'Help', submenu: [{ label: 'FAQ', url: '/faq' }] },
  ]

  function menuLabels(extra: Record<string, unknown>, open: boolean): string[] {
    let result: string[] = []
    withMounted(
      b.create(b.Menu, {
        label: 'Main',
        items: menuItems,
        toggle: true,
        defaultOpen: open,
        ...extra,
      }),
      (container) => {
        result = labels(container)
      },
    )
    return result
  }

  t('Menu toggle and submenu labels default to English', () => {
    assertEquals(menuLabels({}, false), ['Main', 'Open menu'])
    assertEquals(menuLabels({}, true), ['Main', 'Close menu', 'Shop submenu'])
  })

  t('Menu label props win, {name} is filled in', () => {
    const props = {
      openLabel: 'Abrir menú',
      closeLabel: 'Cerrar menú',
      submenuLabel: 'Submenú de {name}',
    }
    assertEquals(menuLabels(props, false), ['Main', 'Abrir menú'])
    assertEquals(menuLabels(props, true), ['Main', 'Cerrar menú', 'Submenú de Shop'])
  })

  // --- Slider --------------------------------------------------------------------------------

  const slides = ['a', 'b', 'c'].map((s) => b.create('div', { key: s }, s))

  function slider(extra: Record<string, unknown>) {
    return b.create(b.Slider, { ...extra }, ...slides)
  }

  t('Slider arrows, pause/play, role description and status default to English', () => {
    withMounted(slider({ autoPlayInterval: 5000 }), (container) => {
      assertEquals(labels(container), [
        'Carousel',
        'Previous slide',
        'Next slide',
        'Pause slideshow',
      ])
      assertEquals(
        must(container.querySelector('[data-space-ui="slider"]')).getAttribute(
          'aria-roledescription',
        ),
        'carousel',
      )
      assert(container.textContent?.includes('Slide 1 of 3'))
    })
    withMounted(slider({ showDots: true }), (container) => {
      assertEquals(labels(container).slice(1), ['Go to slide 1', 'Go to slide 2', 'Go to slide 3'])
    })
  })

  t('Slider label props win, markers are filled in', () => {
    const props = {
      label: 'Fotos',
      roleDescription: 'carrusel',
      previousLabel: 'Anterior',
      nextLabel: 'Siguiente',
      pauseLabel: 'Pausar',
      playLabel: 'Reproducir',
      dotLabel: 'Ir a {n}',
      statusLabel: '{n} de {total}',
    }
    withMounted(slider({ ...props, autoPlayInterval: 5000 }), (container) => {
      assertEquals(labels(container), ['Fotos', 'Anterior', 'Siguiente', 'Pausar'])
      assertEquals(
        must(container.querySelector('[data-space-ui="slider"]')).getAttribute(
          'aria-roledescription',
        ),
        'carrusel',
      )
      assert(container.textContent?.includes('1 de 3'))
      // Pausing switches the control to the play text.
      b.act(() => must(container.querySelector('[aria-label="Pausar"]') as HTMLElement).click())
      assert(container.querySelector('[aria-label="Reproducir"]'))
    })
    withMounted(slider({ ...props, showDots: true }), (container) => {
      assertEquals(labels(container).slice(1), ['Ir a 1', 'Ir a 2', 'Ir a 3'])
    })
  })

  // --- DatePicker ----------------------------------------------------------------------------

  function openPicker(extra: Record<string, unknown>, run: (container: HTMLElement) => void) {
    withMounted(
      b.create(b.DatePicker, {
        defaultOpen: true,
        value: '2024-05-10T09:30',
        withTime: true,
        placeholder: 'Pick',
        ...extra,
      }),
      run,
    )
  }

  const pickerLabelProps = {
    previousMonthLabel: 'Mes anterior',
    nextMonthLabel: 'Mes siguiente',
    previousYearLabel: 'Año anterior',
    nextYearLabel: 'Año siguiente',
    previousYearsLabel: 'Años anteriores',
    nextYearsLabel: 'Años siguientes',
    timeLabel: 'Hora del día',
    hourLabel: 'Hora',
    minuteLabel: 'Minuto',
    doneLabel: 'Listo',
    monthGridLabel: 'Mes de {year}',
    yearGridLabel: 'Años {from} a {to}',
  }

  function clickByText(container: HTMLElement, text: string) {
    const el = [...container.querySelectorAll('button')].find((x) => x.textContent === text)
    b.act(() => must(el as HTMLElement).click())
  }

  function pickerStages(container: HTMLElement): string[][] {
    const days = labels(container)
    clickByText(container, 'May')
    const months = labels(container)
    clickByText(container, '2024')
    const years = labels(container)
    return [days, months, years]
  }

  t('DatePicker texts default to English across the three views', () => {
    openPicker({}, (container) => {
      const [days, months, years] = pickerStages(container)
      assert(days.includes('Previous month') && days.includes('Next month'))
      assert(days.includes('Time') && days.includes('Hour') && days.includes('Minute'))
      assert(months.includes('Previous year') && months.includes('Next year'))
      assert(months.includes('Select a month in 2024'))
      assert(years.includes('Previous years') && years.includes('Next years'))
      assert(years.includes('Select a year, 2016 to 2027'))
    })
    openPicker({}, (container) => assert(container.textContent?.includes('Done')))
  })

  t('DatePicker label props win, markers are filled in', () => {
    openPicker(pickerLabelProps, (container) => {
      const [days, months, years] = pickerStages(container)
      assert(days.includes('Mes anterior') && days.includes('Mes siguiente'))
      assert(days.includes('Hora del día') && days.includes('Hora') && days.includes('Minuto'))
      assert(months.includes('Año anterior') && months.includes('Año siguiente'))
      assert(months.includes('Mes de 2024'))
      assert(years.includes('Años anteriores') && years.includes('Años siguientes'))
      assert(years.includes('Años 2016 a 2027'))
    })
    openPicker(pickerLabelProps, (container) => {
      assert(container.textContent?.includes('Listo'))
      assert(!container.textContent?.includes('Done'))
    })
  })

  // --- SocialLinksInput ----------------------------------------------------------------------

  const entries = [
    { id: '1', url: 'https://instagram.com/a', network: null },
    { id: '2', url: '', network: null },
  ]

  t('SocialLinksInput texts default to English', () => {
    withMounted(b.create(b.SocialLinksInput, { defaultValues: entries }), (container) => {
      assertEquals(labels(container), [
        'Social link 1',
        'Remove https://instagram.com/a',
        'Social link 2',
        'Remove this link',
        'Add another social link',
      ])
    })
  })

  t('SocialLinksInput label props win, markers are filled in', () => {
    withMounted(
      b.create(b.SocialLinksInput, {
        defaultValues: entries,
        linkLabel: 'Enlace {n}',
        removeLabel: 'Quitar {url}',
        removeEmptyLabel: 'Quitar este enlace',
        addButtonLabel: 'Añadir',
      }),
      (container) => {
        assertEquals(labels(container), [
          'Enlace 1',
          'Quitar https://instagram.com/a',
          'Enlace 2',
          'Quitar este enlace',
          'Añadir',
        ])
      },
    )
  })

  // --- SocialNetworks ------------------------------------------------------------------------

  const links = [{ name: 'x', url: 'https://x.com/a', icon: { img: '/x.svg' } }]

  t('SocialNetworks alt, title and link name default to English', () => {
    withMounted(b.create(b.SocialNetworks, { links }), (container) => {
      const a = must(container.querySelector('a'))
      assertEquals(a.getAttribute('aria-label'), 'Go to x')
      assertEquals(a.getAttribute('title'), 'x logo')
      assertEquals(must(container.querySelector('img')).getAttribute('alt'), 'x logo')
    })
  })

  t('SocialNetworks label props win, per-link values still win over them', () => {
    withMounted(
      b.create(b.SocialNetworks, { links, logoLabel: 'Logo de {name}', linkLabel: 'Ir a {name}' }),
      (container) => {
        const a = must(container.querySelector('a'))
        assertEquals(a.getAttribute('aria-label'), 'Ir a x')
        assertEquals(a.getAttribute('title'), 'Logo de x')
        assertEquals(must(container.querySelector('img')).getAttribute('alt'), 'Logo de x')
      },
    )
    withMounted(
      b.create(b.SocialNetworks, {
        links: [{ ...links[0], label: 'Mi X', tooltip: 'Mi tooltip' }],
        linkLabel: 'Ir a {name}',
      }),
      (container) => {
        const a = must(container.querySelector('a'))
        assertEquals(a.getAttribute('aria-label'), 'Mi X')
        assertEquals(a.getAttribute('title'), 'Mi tooltip')
      },
    )
  })

  // --- Server render: the texts are the same string on the server and the client --------------

  t('server markup carries the prop values (no client-only resolution)', () => {
    const html = b.renderToString(
      b.create(b.SocialNetworks, { links, linkLabel: 'Ir a {name}' }),
    )
    assert(html.includes('Ir a x'))
    const modal = b.renderToString(
      b.create(b.Modal, { open: true, onClose: () => {}, label: 'D', closeLabel: 'Cerrar' }, 'x'),
    )
    assert(modal.includes('aria-label="Cerrar"'))
  })
}
