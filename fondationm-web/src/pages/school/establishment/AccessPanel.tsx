import { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { formatDayWithYear, parseIso } from '../../../lib/dateTime'
import { studentIdentifier } from '../../../lib/studentLogin'
import type { ManagedClass } from '../classes/classData'
import { useDeleteStudent, useMoveStudent, type Student } from './establishmentData'
import { ACCESS_NOTE, studentErrorMessage } from './establishmentText'
import { studentName, type AccessSheet } from './sheets'

/** Contenu de la fiche (écran et impression). */
function SheetBody({ sheet, compact = false }: { sheet: AccessSheet; compact?: boolean }) {
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
      {!compact && <p className="text-[13px] font-bold">{ACCESS_NOTE}</p>}
    </>
  )
}

/** Fiches à imprimer, une par page, hors de l'application (masquée à l'impression, voir styles/theme.css). */
export function PrintSheets({ sheets }: { sheets: readonly AccessSheet[] }) {
  if (sheets.length === 0) return null
  return createPortal(
    <div className="fiches-impression hidden bg-white p-8 text-ink print:block">
      {sheets.map((sheet) => (
        <section key={sheet.studentId} aria-label={`Fiche de ${sheet.name}`} className="flex break-after-page flex-col gap-3">
          <p className="font-display text-2xl">FondationM</p>
          <SheetBody sheet={sheet} compact />
          <p className="text-sm font-bold">
            Connexion : page « Espace élève » de la Fondation M, avec cet identifiant et ce code. Remise en main propre.
          </p>
        </section>
      ))}
    </div>,
    document.body,
  )
}

interface AccessPanelProps {
  student: Student
  sheet: AccessSheet | undefined
  classes: readonly ManagedClass[]
  onPrint: (sheet: AccessSheet) => void
  onRenew: (student: Student) => void
  onMoved: (student: Student, classId: string) => void
  onRemoved: (student: Student) => void
  onConfirmRemove: (student: Student, remove: () => Promise<void>) => void
  /** Modifier la classe visée (effectif plein). */
  onEditClass: (classId: string) => void
}

/**
 * Colonne de droite (PC) ou bloc sous la liste (mobile) pour l'élève choisi : fiche jaune `#E5A60A` si le code
 * est encore affichable (« Imprimer la fiche »), sinon « Accès créé » et « Nouvelle fiche » ; puis changement de
 * classe et retrait.
 */
export function AccessPanel({
  student,
  sheet,
  classes,
  onPrint,
  onRenew,
  onMoved,
  onRemoved,
  onConfirmRemove,
  onEditClass,
}: AccessPanelProps) {
  const id = useId()
  const name = studentName(student)
  const others = classes.filter((cls) => cls.id !== student.classId)
  const [target, setTarget] = useState(others[0]?.id ?? '')
  const move = useMoveStudent()
  const remove = useDeleteStudent()
  const targetClass = classes.find((cls) => cls.id === target) ?? null
  const moveError = move.isError ? studentErrorMessage(move.error, targetClass) : null
  const created = parseIso(student.createdAt)

  return (
    <div className="flex flex-col gap-4">
      {sheet ? (
        <section aria-label="Fiche d'accès" className="flex flex-col gap-2.5 rounded-[20px] bg-yellow p-4 text-ink lg:gap-3 lg:rounded-[24px] lg:p-5">
          <SheetBody sheet={sheet} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPrint(sheet)}
              className="inline-flex min-h-touch flex-1 items-center justify-center rounded-[12px] bg-ink px-3.5 text-[13px] font-black text-cream lg:flex-none"
            >
              Imprimer la fiche
            </button>
          </div>
        </section>
      ) : (
        <section aria-label={`Accès de ${name}`} className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-4 lg:rounded-[24px] lg:p-5">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-muted">Accès créé</p>
          <p className="font-display text-[22px] leading-none text-ink lg:text-[26px]">{name}</p>
          <p className="text-sm font-bold text-muted">
            Identifiant : <span className="font-black text-ink">{studentIdentifier(student.email)}</span>
            {created && ` · créé le ${formatDayWithYear(created)}`}
          </p>
          <p className="text-[13px] font-bold text-muted">
            Le code de la fiche n’est plus affichable. Une nouvelle fiche remplace l’ancien code.
          </p>
          <Button size="md" className="self-start" onClick={() => onRenew(student)}>
            Nouvelle fiche
          </Button>
        </section>
      )}

      <section aria-label={`Gérer ${name}`} className="flex flex-col gap-3 rounded-[20px] bg-surface p-4 lg:rounded-[24px] lg:p-5">
        {others.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-classe`} className="text-[13px] font-extrabold text-ink">
              Changer de classe
            </label>
            <div className="flex gap-2">
              <Select id={`${id}-classe`} value={target} onChange={(event) => setTarget(event.target.value)} className="h-11 min-w-0 flex-1">
                {others.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.title}
                  </option>
                ))}
              </Select>
              <Button
                size="md"
                variant="secondary"
                loading={move.isPending}
                onClick={() => move.mutate({ id: student.id, classId: target }, { onSuccess: () => onMoved(student, target) })}
              >
                Déplacer
              </Button>
            </div>
            {moveError && (
              <Alert
                tone="error"
                action={
                  moveError.full && (
                    <Button size="md" variant="outline" onClick={() => onEditClass(target)}>
                      Modifier la classe
                    </Button>
                  )
                }
              >
                {moveError.message}
              </Alert>
            )}
          </div>
        )}
        <Button
          size="md"
          variant="outlineInk"
          className="self-start"
          loading={remove.isPending}
          onClick={() => onConfirmRemove(student, async () => {
            await remove.mutateAsync(student.id)
            onRemoved(student)
          })}
        >
          Retirer l’élève
        </Button>
      </section>
    </div>
  )
}
