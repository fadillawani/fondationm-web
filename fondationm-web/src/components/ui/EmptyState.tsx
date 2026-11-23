import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-block border-2 border-dashed border-line px-6 py-10 text-center">
      <h2 className="text-2xl text-ink">{title}</h2>
      {description && <p className="max-w-md font-semibold text-muted">{description}</p>}
      {action}
    </div>
  )
}
