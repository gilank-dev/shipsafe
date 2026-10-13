import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons must have an accessible name. */
  'aria-label': string
  children: ReactNode
}

export function IconButton({ className = '', type = 'button', children, ...rest }: IconButtonProps) {
  return (
    <button type={type} className={`btn min-w-[44px] min-h-[44px] sm:min-w-9 sm:min-h-0 px-2 ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}
