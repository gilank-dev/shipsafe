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
    <button type="button" className="btn" aria-pressed={theme === 'dark'} onClick={toggle}>
      {theme === 'dark' ? <IconMoon /> : <IconSun />}
      {theme === 'dark' ? 'Light theme' : 'Dark theme'}
    </button>
  )
}
