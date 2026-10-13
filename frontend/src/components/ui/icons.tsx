import type { SVGProps } from 'react'

// Hand-drawn 16px line glyphs. Decorative: every use sits next to a text label or inside a labelled button.
type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>

function Svg({ children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 3v10l8-5z" />
  </Svg>
)
export const IconStop = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="9" height="9" />
  </Svg>
)
export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5.5" y="5.5" width="8" height="8" />
    <path d="M10.5 5.5v-3h-8v8h3" />
  </Svg>
)
export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8.5l3.5 3.5L13 4.5" />
  </Svg>
)
export const IconCross = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
  </Svg>
)
export const IconHalf = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="10" height="10" />
    <path d="M3 3h5v10H3z" fill="currentColor" />
  </Svg>
)
export const IconDash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8h9" />
  </Svg>
)
export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 2.5l6 10.5H2z" />
    <path d="M8 6.5v3M8 11.2v.3" />
  </Svg>
)
export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5v3h-3" />
  </Svg>
)
export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
  </Svg>
)
export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" />
  </Svg>
)
export const IconClose = IconCross
export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 11V2.5M4.5 6L8 2.5 11.5 6M2.5 13.5h11" />
  </Svg>
)
export const IconFile = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 1.5h6l3 3v10h-9zM9.5 1.5v3h3" />
  </Svg>
)
export const IconChevron = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6l4 4 4-4" />
  </Svg>
)
export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 2.5V11M4.5 7.5L8 11l3.5-3.5M2.5 13.5h11" />
  </Svg>
)
