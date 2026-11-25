import { useId, useState } from 'react'
import { PrintSheets, SheetBody } from '../../../components/access/AccessSheet'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { formatDayWithYear, parseIso } from '../../../lib/dateTime'
import { studentIdentifier } from '../../../lib/studentLogin'
import type { ManagedClass } from '../classes/classData'
import { useDeleteStudent, useMoveStudent, type Student } from './establishmentData'
import { ACCESS_NOTE, studentErrorMessage } from './establishmentText'
import { studentName, type AccessSheet } from './sheets'

/** Fiches à imprimer des élèves (une par page). */
export function StudentPrintSheets({ sheets }: { sheets: readonly AccessSheet[] }) {
  return (
    <PrintSheets
      sheets={sheets.map((sheet) => ({ ...sheet, key: sheet.studentId }))}
      footer="Connexion : page « Espace élève » de la Fondation M, avec cet identifiant et ce code. Remise en main propre."
    />
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
          <SheetBody sheet={sheet} note={ACCESS_NOTE} />
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
