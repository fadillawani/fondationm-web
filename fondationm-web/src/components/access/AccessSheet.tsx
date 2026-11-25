import { createPortal } from 'react-dom'
import type { SheetContent } from './sheetTypes'

/**
 * Contenu d'une fiche d'accès à remettre (écran et impression), partagé par les élèves (F6) et les donateurs (F8) :
 * nom, identifiant, code d'accès affiché une seule fois.
 */
export function SheetBody({ sheet, note, compact = false }: { sheet: SheetContent; note: string; compact?: boolean }) {
  return (
    <>
      <p className="text-[11px] font-black uppercase tracking-[0.1em] lg:text-xs">Fiche d'accès à remettre</p>
      <p className="font-display text-[22px] leading-none lg:text-[26px]">{sheet.name}</p>
      <dl className="flex flex-col gap-1.5 rounded-[14px] bg-surface p-3 lg:gap-2 lg:rounded-2xl lg:p-3.5">
        <div className="flex justify-between gap-2">
          <dt className="text-xs font-extrabold text-muted lg:text-[13px]">Identifiant</dt>
          <dd className="text-sm font-black break-all lg:text-[15px]">{sheet.login}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs font-extrabold text-muted lg:text-[13px]">Code d'accès</dt>
          <dd className="font-display text-lg tracking-[0.08em] lg:text-xl">{sheet.code}</dd>
        </div>
      </dl>
      {!compact && <p className="text-[13px] font-bold">{note}</p>}
    </>
  )
}

/**
 * Fiches à imprimer, une par page, hors de l'application : l'application est masquée à l'impression pendant que
 * `impression-fiches` est posée sur <body> (voir styles/theme.css et `usePrintQueue`).
 */
export function PrintSheets({ sheets, footer }: { sheets: readonly (SheetContent & { key: string })[]; footer: string }) {
  if (sheets.length === 0) return null
  return createPortal(
    <div className="fiches-impression hidden bg-white p-8 text-ink print:block">
      {sheets.map((sheet) => (
        <section key={sheet.key} aria-label={`Fiche de ${sheet.name}`} className="flex break-after-page flex-col gap-3">
          <p className="font-display text-2xl">FondationM</p>
          <SheetBody sheet={sheet} note="" compact />
          <p className="text-sm font-bold">{footer}</p>
        </section>
      ))}
    </div>,
    document.body,
  )
}
