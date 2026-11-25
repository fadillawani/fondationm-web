import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
export type ButtonSize = 'lg' | 'md'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-terra text-white hover:bg-terra-dark',
  secondary: 'bg-indigo text-cream hover:bg-indigo/90',
  ghost: 'bg-transparent text-indigo hover:bg-indigo-tint',
  danger: 'bg-red text-white hover:bg-red/90',
  success: 'bg-green text-white hover:bg-green/90',
  outline: 'border-2 border-line bg-surface text-ink hover:border-muted',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  lg: 'min-h-14 px-6 font-display text-xl leading-none',
  md: 'min-h-touch px-4 text-[15px] font-extrabold',
}

export function buttonClass(
  variant: ButtonVariant,
  { size = 'lg', fullWidth = false, className }: { size?: ButtonSize; fullWidth?: boolean; className?: string } = {},
): string {
  return cn(
    'inline-flex min-w-touch items-center justify-center gap-2 rounded-button transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    fullWidth && 'w-full',
    className,
  )
}

export function controlClass(invalid: boolean, className?: string): string {
  return cn(
    'block h-12 w-full rounded-field border-2 bg-surface px-4 text-[15px] font-semibold text-ink',
    'placeholder:font-normal placeholder:text-muted',
    'focus:border-terra focus:ring-[3px] focus:ring-terra/30 focus-visible:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-60',
    invalid ? 'border-red' : 'border-line',
    className,
  )
}
