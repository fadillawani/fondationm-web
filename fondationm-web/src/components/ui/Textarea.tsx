import type { ComponentPropsWithRef } from 'react'
import { controlClass } from './styles'

export function Textarea({ className, rows = 4, ...props }: ComponentPropsWithRef<'textarea'>) {
  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  return <textarea rows={rows} className={controlClass(invalid, className)} {...props} />
}
