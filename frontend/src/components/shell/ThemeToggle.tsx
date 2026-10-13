import { announce } from '../../state/announcer'
import { useStore } from '../../state/store'
import { IconMoon, IconSun } from '../ui/icons'

/** Switches light/dark theme and syncs with Zustand store and document root. */
export function ThemeToggle() {
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)

  const toggle = () => {
    toggleTheme()
    const next = theme === 'dark' ? 'Light' : 'Dark'
    announce(`${next} theme on`)
  }

  return (
    <button
      type="button"
      className="btn min-w-[44px] px-2 sm:px-3"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={theme === 'dark'}
      onClick={toggle}
    >
      {theme === 'dark' ? <IconMoon /> : <IconSun />}
      <span className="hidden sm:inline">{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
    </button>
  )
}
