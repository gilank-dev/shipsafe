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
    <span className="tag status" data-status={label}>
      <Glyph />
      {label}
    </span>
  )
}
