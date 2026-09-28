import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'

/**
 * Day / night toggle for the topbar. Icon reflects the theme you will
 * switch TO (sun in night mode, moon in day mode).
 */
export default function ThemeToggle() {
  const { isNight, toggle } = useTheme()

  return (
    <button
      type="button"
      className="action-btn topbar-quick"
      onClick={toggle}
      title={isNight ? 'Switch to day theme' : 'Switch to night theme'}
      aria-label={isNight ? 'Switch to day theme' : 'Switch to night theme'}
    >
      {isNight ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
