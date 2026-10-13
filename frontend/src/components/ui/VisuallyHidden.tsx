import type { ElementType, ReactNode } from 'react'

export function VisuallyHidden({ as: Tag = 'span', children }: { as?: ElementType; children: ReactNode }) {
  return <Tag className="visually-hidden">{children}</Tag>
}
