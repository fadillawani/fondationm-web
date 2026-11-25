import { cn } from '../../lib/cn'

export function Logo({ className }: { className?: string }) {
  return <span className={cn('font-display text-2xl leading-none', className)}>FondationM</span>
}
