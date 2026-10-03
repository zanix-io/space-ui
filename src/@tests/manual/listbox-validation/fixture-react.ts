// deno-lint-ignore-file no-non-null-assertion
import { createElement as h, useState } from 'react'
import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Combobox } from 'components/Combobox/index.ts'
import { MultiSelect } from 'components/MultiSelect/index.ts'
import { FRUITS, installEventLog, LANGUAGES, matchesLabel, MESSAGE } from './fixture-shared.ts'

function ComboboxForm(): ReactElement {
  const [text, setText] = useState('')
  const options = FRUITS.filter((fruit) => fruit.label.toLowerCase().includes(text.toLowerCase()))
  const message = text !== '' && !matchesLabel(FRUITS, text) ? MESSAGE : undefined
  return h(
    'form',
    { id: 'combobox-form' },
    h(Combobox, {
      options,
      inputValue: text,
      onInputValueChange: setText,
      id: 'combobox-input',
      'aria-label': 'Fruit',
      validationMessage: message,
    }),
    h('button', { type: 'submit', id: 'combobox-submit' }, 'Save'),
  )
}

function MultiSelectForm(): ReactElement {
  const [text, setText] = useState('')
  const options = LANGUAGES.filter((language) =>
    language.label.toLowerCase().includes(text.toLowerCase())
  )
  return h(
    'form',
    { id: 'multiselect-form' },
    h(MultiSelect, {
      options,
      inputValue: text,
      onInputValueChange: setText,
      id: 'multiselect-input',
      'aria-label': 'Languages',
      validationMessage: MESSAGE,
    }),
    h('button', { type: 'submit', id: 'multiselect-submit' }, 'Save'),
  )
}

installEventLog()
createRoot(document.getElementById('root')!).render(
  h('div', null, h(ComboboxForm), h(MultiSelectForm), h('input', { id: 'elsewhere' })),
)
