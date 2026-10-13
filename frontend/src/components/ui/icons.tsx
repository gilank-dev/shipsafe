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
export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14" />
  </Svg>
)
export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 2l5 2v4c0 3.5-2.5 6-5 7-2.5-1-5-3.5-5-7V4l5-2z" />
  </Svg>
)
export const IconKey = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5.5" cy="8" r="3" />
    <path d="M8.5 8h5m-2 0v2m-2-2v2" />
  </Svg>
)
export const IconGit = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="4.5" cy="4.5" r="2" />
    <circle cx="4.5" cy="11.5" r="2" />
    <circle cx="11.5" cy="7.5" r="2" />
    <path d="M4.5 6.5v3M4.5 8h4.5a2.5 2.5 0 0 0 2.5-2.5v0" />
  </Svg>
)

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="7" width="10" height="7" />
    <path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7" />
  </Svg>
)

export const IconGitHub = (p: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)

export const IconGoogle = (p: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
)

