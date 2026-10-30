import type { FC } from 'react'

export interface BrandLogoProps {
  className?: string
  markClassName?: string
  textClassName?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Universal ShipSafe Brand Signature:
 * A crisp geometric square mark + stretched bold wordmark [font-stretch:125%]
 * Exactly matching the top-left cockpit console header.
 */
export const BrandLogo: FC<BrandLogoProps> = ({
  className = '',
  markClassName = '',
  textClassName = '',
  showText = true,
  size = 'md',
}) => {
  const markSize = size === 'sm' ? 'size-3' : size === 'lg' ? 'size-4 sm:size-5' : 'size-3.5'
  const textSize =
    size === 'sm'
      ? 'text-sm font-extrabold [font-stretch:125%]'
      : size === 'lg'
        ? 'text-xl sm:text-2xl font-extrabold [font-stretch:125%]'
        : 'text-h3 leading-none font-extrabold [font-stretch:125%]'

  return (
    <div className={`group inline-flex items-center gap-2.5 shrink-0 select-none cursor-pointer ${className}`}>
      <span
        className={`block ${markSize} bg-ink dark:bg-white bg-[#18181B] shrink-0 transition-transform duration-200 ease-out group-hover:group-hover-micro-tremble active:scale-90 ${markClassName}`}
        aria-hidden="true"
      />
      {showText && (
        <span
          className={`leading-none font-extrabold [font-stretch:125%] font-sans tracking-tight text-ink dark:text-white text-[#18181B] transition-colors duration-150 group-hover:text-neutral-950 dark:group-hover:text-white ${textSize} ${textClassName}`}
        >
          ShipSafe
        </span>
      )}
    </div>
  )
}
