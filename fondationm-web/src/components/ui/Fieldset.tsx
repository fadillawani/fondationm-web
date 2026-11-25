import type { ReactNode } from 'react'

export function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="mb-4 text-xs font-black uppercase tracking-[0.1em] text-terra">{legend}</legend>
      {children}
    </fieldset>
  )
}
