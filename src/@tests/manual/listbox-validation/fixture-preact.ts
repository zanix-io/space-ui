// deno-lint-ignore-file no-non-null-assertion
import { h, render } from 'preact'
import type { VNode } from 'preact'
import { useState } from 'preact/hooks'
import { Combobox } from 'components/Combobox/index.preact.ts'
import { MultiSelect } from 'components/MultiSelect/index.preact.ts'
import { FRUITS, installEventLog, LANGUAGES, matchesLabel, MESSAGE } from './fixture-shared.ts'

function ComboboxForm(): VNode {
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
  ) as VNode
}

function MultiSelectForm(): VNode {
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
  ) as VNode
}

installEventLog()
render(
  h('div', null, h(ComboboxForm, null), h(MultiSelectForm, null), h('input', { id: 'elsewhere' })),
  document.getElementById('root')!,
)
