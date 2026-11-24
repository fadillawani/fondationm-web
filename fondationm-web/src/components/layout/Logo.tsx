import { cn } from '../../lib/cn'

interface LogoProps {
  className?: string
  subtitle?: string
}

export function Logo({ className, subtitle }: LogoProps) {
  if (subtitle === undefined) {
    return <span className={cn('font-display text-2xl leading-none', className)}>FondationM</span>
  }
  return (
    <span className={cn('flex flex-col gap-1', className)}>
      <span className="font-display text-2xl leading-none">FondationM</span>
      <span className="text-sm font-bold">{subtitle}</span>
    </span>
  )
}
