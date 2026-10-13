import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'quiet'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variant?: Variant
  /** Uses aria-disabled so the button stays focusable and can explain itself via aria-describedby. */
  disabled?: boolean
  children: ReactNode
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn',
  quiet: 'btn btn-quiet',
}

export function Button({ variant = 'secondary', disabled = false, className = '', onClick, type = 'button', children, ...rest }: ButtonProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      e.preventDefault()
      return
    }
    onClick?.(e)
  }
  return (
    <button
      type={type}
      className={`${VARIANT_CLASS[variant]} ${className}`.trim()}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  )
}
