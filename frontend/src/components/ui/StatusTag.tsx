import { IconCheck, IconCross, IconDash, IconHalf } from './icons'

export type StatusLabel = 'Pass' | 'Partial' | 'Fail' | 'Not assessed'

const GLYPH = { Pass: IconCheck, Partial: IconHalf, Fail: IconCross, 'Not assessed': IconDash } as const

export function toStatusLabel(status: string): StatusLabel {
  return status === 'Pass' || status === 'Partial' || status === 'Fail' ? status : 'Not assessed'
}

export function StatusTag({ status }: { status: string }) {
  const label = toStatusLabel(status)
  const Glyph = GLYPH[label]
  return (
    <span className="tag status font-mono font-bold text-caption tracking-tight" data-status={label}>
      <Glyph width={12} height={12} className="shrink-0" />
      <span>{label}</span>
    </span>
  )
}
