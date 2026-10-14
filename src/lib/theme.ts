import { ref } from 'vue'

export type Theme = 'light' | 'dark'
export const THEME_STORAGE_KEY = 'central-web:theme'

export function preferredTheme(saved: string | null, systemDark = false): Theme {
  return saved === 'dark' || saved !== 'light' && systemDark ? 'dark' : 'light'
}

function storedPreference(): string | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(THEME_STORAGE_KEY) }
  catch { return null }
}
function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const theme = ref<Theme>(preferredTheme(storedPreference(), systemPrefersDark()))

function applyTheme(mode: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = mode
  document.documentElement.style.colorScheme = mode
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#151523' : '#f7f8fb')
}

export function setTheme(mode: Theme): void {
  theme.value = mode
  applyTheme(mode)
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_STORAGE_KEY, mode) }
  catch { /* A preferência ainda funciona enquanto a aba estiver aberta. */ }
}

export function toggleTheme(): void { setTheme(theme.value === 'dark' ? 'light' : 'dark') }

applyTheme(theme.value)

// Enquanto a usuária não fizer uma escolha manual, segue as mudanças do sistema.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', event => {
    if (storedPreference() !== 'light' && storedPreference() !== 'dark') {
      theme.value = event.matches ? 'dark' : 'light'
      applyTheme(theme.value)
    }
  })
}
