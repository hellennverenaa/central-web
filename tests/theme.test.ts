import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { preferredTheme, THEME_STORAGE_KEY } from '../src/lib/theme.ts'

test('preferência de tema: escolha explícita prevalece sobre sistema', () => {
  assert.equal(preferredTheme('dark', false), 'dark')
  assert.equal(preferredTheme('light', true), 'light')
  assert.equal(preferredTheme(null, true), 'dark')
  assert.equal(preferredTheme(null, false), 'light')
  assert.equal(preferredTheme('inválido', false), 'light')
  assert.equal(THEME_STORAGE_KEY, 'central-web:theme')
})

test('paletas preservam light e mudam superfícies e textos no dark', () => {
  const css = readFileSync('src/theme-colors.css', 'utf8')
  const light = css.split('html[data-theme="dark"]{color-scheme:dark;')[0]!
  const dark = css.split('html[data-theme="dark"]{color-scheme:dark;')[1]!.split('\n}\n')[0]!
  assert.match(light, /--cw-bg-f7f8fb:#f7f8fb;/)
  assert.match(light, /--cw-bg-fff:#fff;/)
  assert.match(light, /--cw-fg-202237:#202237;/)
  assert.match(dark, /--cw-bg-f7f8fb:#171725;/)
  assert.match(dark, /--cw-fg-202237:#eeeaf7;/)
  assert.doesNotMatch(dark, /--cw-bg-fff:#fff;/)
  const tokens = [...new Set([...readFileSync('src/style.css', 'utf8').matchAll(/var\((--cw-[a-z0-9-]+)\)/g)].map(m => m[1]))]
  const missing = tokens.filter(token => !css.includes(token + ':'))
  assert.deepEqual(missing, [], 'Todas as cores aplicadas nas telas devem ter token definido')
})
