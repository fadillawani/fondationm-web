import { cn } from '../../../lib/cn'
import { initialsOf } from '../../../lib/initials'
import type { Student } from './establishmentData'
import { studentName } from './sheets'

interface StudentTableProps {
  students: readonly Student[]
  /** Élèves dont la fiche (code) est encore affichable pendant la visite. */
  withSheet: ReadonlySet<string>
  selected: string | null
  onSelect: (id: string) => void
  onRenew: (student: Student) => void
}

/**
 * Liste des élèves (maquette W5-E2) : tableau sur PC (« Élève », « Accès », « Action »), cartes sur mobile.
 * Statuts honnêtes : « Fiche à remettre » (code produit pendant la visite) ou « Accès créé » ; le contrat ne dit pas
 * si l'élève s'est connecté.
 */
export function StudentTable({ students, withSheet, selected, onSelect, onRenew }: StudentTableProps) {
  return (
    <table aria-label="Liste des élèves" className="w-full border-collapse max-lg:block">
      <thead className="max-lg:sr-only">
        <tr className="text-left text-xs font-black uppercase tracking-[0.06em] text-muted">
          <th scope="col" className="w-[45%] px-3 pb-2">
            Élève
          </th>
          <th scope="col" className="px-3 pb-2">
            Accès
          </th>
          <th scope="col" className="w-[150px] px-3 pb-2">
            Action
          </th>
        </tr>
      </thead>
      <tbody className="max-lg:flex max-lg:flex-col max-lg:gap-2">
        {students.map((student) => {
          const name = studentName(student)
          const sheet = withSheet.has(student.id)
          const active = student.id === selected
          return (
            <tr
              key={student.id}
              className={cn(
                'lg:border-t lg:border-[#EDE6D6]',
                'max-lg:grid max-lg:grid-cols-[minmax(0,1fr)_auto] max-lg:items-center max-lg:gap-x-2.5 max-lg:gap-y-[3px] max-lg:rounded-2xl max-lg:border-2 max-lg:bg-surface max-lg:px-3 max-lg:py-2.5',
                active ? 'bg-[#FFF6DA] max-lg:border-yellow' : 'max-lg:border-transparent',
              )}
            >
              <td className="px-3 py-2 max-lg:col-start-1 max-lg:p-0">
                <button
                  type="button"
                  onClick={() => onSelect(student.id)}
                  aria-label={`${name} : gérer l’accès`}
                  aria-pressed={active}
                  className="flex min-h-touch w-full items-center gap-2.5 rounded-[10px] text-left text-[15px] font-black text-ink lg:font-extrabold"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-cream font-display text-[13px] lg:size-[34px]"
                  >
                    {initialsOf(name)}
                  </span>
                  <span className="min-w-0 truncate">{name}</span>
                </button>
              </td>
              <td className="px-3 py-2 max-lg:col-start-1 max-lg:row-start-2 max-lg:p-0 max-lg:pl-[46px]">
                <span
                  className={cn(
                    'inline-block rounded-pill px-2 py-0.5 text-[11px] font-black lg:px-2.5 lg:py-[3px] lg:text-xs',
                    sheet ? 'bg-cream text-ink' : 'bg-[#EDE6D6] text-muted',
                  )}
                >
                  {sheet ? 'Fiche à remettre' : 'Accès créé'}
                </span>
              </td>
              <td className="px-3 py-2 max-lg:col-start-2 max-lg:row-span-2 max-lg:row-start-1 max-lg:p-0">
                <button
                  type="button"
                  onClick={() => (sheet ? onSelect(student.id) : onRenew(student))}
                  aria-label={sheet ? `Voir la fiche de ${name}` : `Nouvelle fiche pour ${name}`}
                  className={cn(
                    'inline-flex min-h-touch w-full items-center justify-center rounded-[12px] border-2 px-3 text-xs font-black lg:text-[13px]',
                    sheet ? 'border-line bg-surface text-ink' : 'border-terra bg-terra text-white',
                  )}
                >
                  {sheet ? (
                    <>
                      <span className="lg:hidden">Fiche</span>
                      <span className="hidden lg:inline">Voir la fiche</span>
                    </>
                  ) : (
                    'Nouvelle fiche'
                  )}
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
