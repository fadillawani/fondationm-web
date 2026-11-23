import type { ComponentPropsWithRef } from 'react'
import { controlClass } from './styles'

export type InputProps = ComponentPropsWithRef<'input'>

export function Input({ className, ...props }: InputProps) {
  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  return <input className={controlClass(invalid, className)} {...props} />
}
