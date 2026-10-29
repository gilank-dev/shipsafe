import { announce } from '../../state/announcer'
import { useStore } from '../../state/store'
import { IconMoon, IconSun } from '../ui/icons'

interface ThemeToggleProps {
  className?: string
}

/** Switches light/dark theme as an icon-only button and syncs with Zustand store and document root. */
export function ThemeToggle({ className }: ThemeToggleProps) {
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
      className={`size-9 rounded-full border border-black/[0.08] dark:border-white/[0.12] bg-neutral-100/90 dark:bg-neutral-800/90 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer shrink-0 active:scale-[0.96] shadow-xs ${className || ''}`}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={theme === 'dark'}
      onClick={toggle}
    >
      {theme === 'dark' ? <IconMoon /> : <IconSun />}
    </button>
  )
}
