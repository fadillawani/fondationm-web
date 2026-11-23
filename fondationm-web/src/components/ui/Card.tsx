import type { ComponentPropsWithRef } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, ...props }: ComponentPropsWithRef<'section'>) {
  return (
    <section className={cn('rounded-card bg-surface p-5 shadow-card md:p-9', className)} {...props} />
  )
}
