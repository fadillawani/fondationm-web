import type { ComponentPropsWithRef } from 'react'
import { controlClass } from './styles'

export function Select({ className, children, ...props }: ComponentPropsWithRef<'select'>) {
  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  return (
    <select className={controlClass(invalid, className)} {...props}>
      {children}
    </select>
  )
}
