import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'gpm_theme' // 'day' | 'night' | 'system'
const ATTR = 'data-theme'

const ThemeContext = createContext(null)

function systemTheme() {
  try {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'night'
  } catch {
    // ignore
  }
  return 'day'
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'day' || raw === 'night' || raw === 'system') return raw
  } catch {
    // ignore
  }
  return 'system'
}

function applyTheme(resolved) {
  try {
    document.documentElement.setAttribute(ATTR, resolved)
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
