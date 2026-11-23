import { cn } from '../../lib/cn'

interface SpinnerProps {
  label?: string
  size?: 'md' | 'lg'
  className?: string
}

export function Spinner({ label = 'Chargement…', size = 'md', className }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'animate-spin rounded-full border-current border-r-transparent',
          size === 'lg' ? 'size-10 border-4' : 'size-5 border-[3px]',
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
