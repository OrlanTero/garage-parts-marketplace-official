import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Theme manager — day / night / system.
 *
 * - Persists to localStorage key `gpm_theme`.
 * - Resolves `system` via prefers-color-scheme.
 * - Applies <html data-theme="day|night"> + color-scheme + theme-color meta.
 * - index.html sets the same attribute pre-paint to avoid a flash.
 *
 * Usage: const { mode, resolved, isNight, setMode, toggle } = useTheme()
 */

export const THEMES = ['day', 'night', 'system']
const STORAGE_KEY = 'gpm_theme' // 'day' | 'night' | 'system'
const ATTR = 'data-theme'

const ThemeContext = createContext(null)

function systemTheme() {
  try {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'night'
  } catch {
    // ignore — fall through to day
  }
  return 'day'
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'day' || raw === 'night' || raw === 'system') return raw
  } catch {
    // private mode etc.
  }
  return 'system'
}

function applyTheme(resolved) {
  try {
    document.documentElement.setAttribute(ATTR, resolved)
    // Tell the browser which color-scheme form controls/scrollbars use.
    document.documentElement.style.colorScheme = resolved === 'night' ? 'dark' : 'light'
    // Keep mobile browser chrome in sync.
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', resolved === 'night' ? '#101216' : '#f5f2eb')
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(readStored) // day | night | system
  const resolved = mode === 'system' ? systemTheme() : mode

  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  // Follow the OS while in system mode.
  useEffect(() => {
    if (mode !== 'system') return undefined
    let mq = null
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return undefined
    }
    if (!mq) return undefined
    const onChange = () => applyTheme(systemTheme())
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [mode])

  const setMode = useCallback((next) => {
    const value = next === 'day' || next === 'night' ? next : 'system'
    setModeState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // ignore
    }
  }, [])

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const current = prev === 'system' ? systemTheme() : prev
      const next = current === 'day' ? 'night' : 'day'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ mode, resolved, isNight: resolved === 'night', setMode, toggle }),
    [mode, resolved, setMode, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme() must be used within a <ThemeProvider>')
  return ctx
}
