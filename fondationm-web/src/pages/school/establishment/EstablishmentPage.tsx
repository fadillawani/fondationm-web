import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../../../api/errors'
import { useCurrentUser } from '../../../auth/currentUserContext'
import { PageTitle } from '../../../components/layout/PageTitle'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Modal } from '../../../components/ui/Modal'
import { Spinner } from '../../../components/ui/Spinner'
import { panelId, tabId } from '../../../components/ui/tabIds'
import { cn } from '../../../lib/cn'
import { schoolSuffix } from '../../../lib/studentLogin'
import { DESKTOP_QUERY, useMediaQuery } from '../../../lib/useMediaQuery'
import { ClassForm } from '../classes/ClassForm'
import { CLASSES_PREFIX, classErrorMessage, useDeleteClass, useManagedClasses, type ManagedClass } from '../classes/classData'
import { LeaveGuardModal } from '../../../components/access/LeaveGuardModal'
import { useLeaveGuard } from '../../../components/access/useLeaveGuard'
import { usePrintQueue } from '../../../components/access/usePrintQueue'
import { AccessPanel, StudentPrintSheets } from './AccessPanel'
import { AddStudentForm } from './AddStudentForm'
import { BulkAddForm } from './BulkAddForm'
import { CLASS_TABS_ID, ClassTabs } from './ClassTabs'
import { renewStudentCode, useClassStudents, type CreatedAccess, type Student } from './establishmentData'
import { NO_CLASS, PRINT_REMINDER, RENEW_WARNING, classSummary, remainingPlaces, studentErrorMessage } from './establishmentText'
import { sheetFor, studentName, type AccessSheet } from './sheets'
import { StudentTable } from './StudentTable'
import { WhatStudentsSee } from './WhatStudentsSee'

type Confirm =
  | { kind: 'renew'; student: Student; classId: string }
  | { kind: 'remove'; student: Student; run: () => Promise<void> }
  | { kind: 'deleteClass'; cls: ManagedClass }

/**
 * « Mon établissement » (maquette W5-E2) : classes, élèves et fiches d'accès. Les codes d'accès vivent dans l'état
 * de cette page (jamais dans l'URL, un stockage, le cache des requêtes ni la console) ; changer d'onglet ne les perd
 * pas, quitter la page les efface (avertissement tant qu'une fiche n'est pas imprimée).
 */
export function EstablishmentPage() {
  const user = useCurrentUser()
  const school = user.details?.kind === 'school' ? user.details : null
  const suffix = schoolSuffix(school?.schoolName ?? '', user.id)
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const classes = useManagedClasses()
  const deleteClass = useDeleteClass()

  const [sheets, setSheets] = useState<ReadonlyMap<string, AccessSheet>>(new Map())
  const printQueue = usePrintQueue<AccessSheet>()
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [bulk, setBulk] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)
  const [classError, setClassError] = useState<string | null>(null)

  const list = classes.data?.items ?? []
  const requested = params.get('classe')
  const cls = list.find((entry) => entry.id === requested) ?? list[0] ?? null
  const students = useClassStudents(cls?.id ?? null)
  const studentList = students.data?.items ?? []
  const count = students.data ? studentList.length : (cls?.accountsCount ?? 0)
  const student = studentList.find((entry) => entry.id === selectedStudent) ?? null
  const classSheets = [...sheets.values()].filter((sheet) => sheet.classId === cls?.id)
  const unprinted = [...sheets.values()].filter((sheet) => !sheet.printed).length

  // Fiches non imprimées : avertissement avant de fermer, de recharger ou de quitter la page.
  const blocker = useLeaveGuard(unprinted > 0)

  function selectClass(id: string) {
    const next = new URLSearchParams(params)
    next.set('classe', id)
    setParams(next, { replace: true })
    setSelectedStudent(null)
    setEditing(false)
    setBulk(false)
    setClassError(null)
  }

  function editClass(id: string) {
    if (id !== cls?.id) selectClass(id)
    setEditing(true)
  }

  function addSheet(sheet: AccessSheet) {
    setSheets((current) => new Map(current).set(sheet.studentId, sheet))
  }

  function created(access: CreatedAccess, classId: string) {
    addSheet(sheetFor(access.student, access.code, classId))
    setSelectedStudent(access.student.id)
    // Liste des élèves et compteurs des onglets ; le code, lui, ne passe jamais par le cache.
    void queryClient.invalidateQueries({ queryKey: CLASSES_PREFIX })
  }

  function print(toPrint: readonly AccessSheet[]) {
    printQueue.print(toPrint, (printed) =>
      setSheets((current) => {
        const next = new Map(current)
        for (const sheet of printed) next.set(sheet.studentId, { ...sheet, printed: true })
        return next
      }),
    )
  }

  function closeConfirm() {
    setConfirm(null)
    setConfirmError(null)
  }

  async function runConfirm() {
    if (confirm === null) return
    setConfirmPending(true)
    setConfirmError(null)
    try {
      if (confirm.kind === 'renew') {
        const code = await renewStudentCode(confirm.student.id)
        addSheet(sheetFor(confirm.student, code, confirm.classId))
        setSelectedStudent(confirm.student.id)
      } else if (confirm.kind === 'remove') {
        await confirm.run()
      } else {
        const removed = confirm.cls
        try {
          await deleteClass.mutateAsync(removed.id)
          const next = list.find((entry) => entry.id !== removed.id)
          if (next) selectClass(next.id)
        } catch (error) {
          setClassError(classErrorMessage(error, removed))
        }
      }
      closeConfirm()
    } catch (error) {
      setConfirmError(studentErrorMessage(error, cls).message)
    } finally {
      setConfirmPending(false)
    }
  }

  const places = cls ? remainingPlaces(cls, count) : null
  const printAll =
    classSheets.length > 0 ? (
      <button
        type="button"
        onClick={() => print(classSheets)}
        className="inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-terra px-[18px] text-[15px] font-black text-white lg:min-h-12 lg:text-sm"
      >
        Imprimer les fiches ({classSheets.length})
      </button>
    ) : null
  const panel =
    student && cls ? (
      <AccessPanel
        key={student.id}
        student={student}
        sheet={sheets.get(student.id)}
        classes={list}
        onPrint={(sheet) => print([sheet])}
        onRenew={(target) => setConfirm({ kind: 'renew', student: target, classId: cls.id })}
        onMoved={(target, classId) => {
          const sheet = sheets.get(target.id)
          if (sheet) addSheet({ ...sheet, classId })
          setSelectedStudent(null)
        }}
        onRemoved={(target) => {
          setSheets((current) => {
            const next = new Map(current)
            next.delete(target.id)
            return next
          })
          setSelectedStudent(null)
        }}
        onConfirmRemove={(target, run) => setConfirm({ kind: 'remove', student: target, run })}
        onEditClass={editClass}
      />
    ) : null

  return (
    <div className="flex flex-col gap-3.5 lg:gap-5">
      <PageTitle
        kicker="Mon établissement · Élèves"
        kickerTone="accent"
        title="Les élèves de vos classes"
        subtitle="Ajoutez vos élèves à leur classe et remettez-leur un accès : ils pourront voir qui viendra leur parler de son métier. Les rencontres restent réservées par classe."
        mobileSubtitle="Ajoutez-les à leur classe et remettez-leur un accès en lecture. Les rencontres restent réservées par classe."
      />

      {unprinted > 0 && (
        <p role="status" className="rounded-[14px] border-2 border-yellow bg-cream px-4 py-3 text-sm font-extrabold text-ink">
          {PRINT_REMINDER}
        </p>
      )}

      {classes.isPending ? (
        <div className="flex justify-center py-10 text-terra">
          <Spinner label="Chargement des classes…" size="lg" />
        </div>
      ) : classes.isError ? (
        <ErrorState message={errorMessage(classes.error)} onRetry={() => void classes.refetch()} retrying={classes.isFetching} />
      ) : (
        <>
          <ClassTabs
            classes={list}
            selected={cls?.id ?? null}
            onSelect={selectClass}
            onCreate={() => setCreating((open) => !open)}
            creating={creating || list.length === 0}
          />

          {(creating || list.length === 0) && (
            <div className="flex flex-col gap-3 rounded-[24px] bg-surface p-4 lg:p-[22px]">
              {list.length === 0 && <p className="text-[15px] font-extrabold text-ink">{NO_CLASS}</p>}
              <ClassForm
                onSaved={(id) => {
                  setCreating(false)
                  selectClass(id)
                }}
                onCancel={list.length > 0 ? () => setCreating(false) : undefined}
              />
            </div>
          )}

          {cls && (
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <section
                role="tabpanel"
                id={panelId(CLASS_TABS_ID)}
                aria-labelledby={tabId(CLASS_TABS_ID, cls.id)}
                className="flex min-w-0 flex-col gap-3.5 lg:flex-[1.6_1_520px] lg:gap-4 lg:rounded-[24px] lg:bg-surface lg:p-[22px]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h2 className="text-2xl text-ink max-lg:sr-only">{cls.title}</h2>
                    <p className="text-[13px] font-extrabold text-muted lg:font-bold">{classSummary(cls, count)}</p>
                    {cls.fieldOfStudy && <p className="text-[13px] font-bold text-muted">Filière : {cls.fieldOfStudy}</p>}
                  </div>
                  {desktop && printAll}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="md" variant="outline" onClick={() => setEditing((open) => !open)} aria-expanded={editing}>
                    Modifier la classe
                  </Button>
                  <Button size="md" variant="outline" onClick={() => setConfirm({ kind: 'deleteClass', cls })}>
                    Supprimer la classe
                  </Button>
                </div>
                {classError && <Alert tone="error">{classError}</Alert>}
                {editing && (
                  <ClassForm key={cls.id} editing={cls} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
                )}

                <AddStudentForm cls={cls} suffix={suffix} onCreated={(access) => created(access, cls.id)} onEditClass={() => setEditing(true)} />
                {bulk ? (
                  <BulkAddForm
                    key={cls.id}
                    cls={cls}
                    places={places}
                    suffix={suffix}
                    onCreated={(access) => created(access, cls.id)}
                    onEditClass={() => setEditing(true)}
                    onClose={() => setBulk(false)}
                  />
                ) : (
                  <Button size="md" variant="ghost" className="self-start" onClick={() => setBulk(true)}>
                    Ajouter plusieurs élèves
                  </Button>
                )}

                {!desktop && printAll}
                {!desktop && panel}

                {students.isPending ? (
                  <div className="flex justify-center py-6 text-terra">
                    <Spinner label="Chargement des élèves…" />
                  </div>
                ) : students.isError ? (
                  <ErrorState message={errorMessage(students.error)} onRetry={() => void students.refetch()} retrying={students.isFetching} />
                ) : studentList.length > 0 ? (
                  <StudentTable
                    students={studentList}
                    withSheet={new Set(classSheets.map((sheet) => sheet.studentId))}
                    selected={selectedStudent}
                    onSelect={setSelectedStudent}
                    onRenew={(target) => setConfirm({ kind: 'renew', student: target, classId: cls.id })}
                  />
                ) : null}
              </section>

              <aside className={cn('flex min-w-0 flex-col gap-4 lg:flex-[1_1_320px]')}>
                {desktop && panel}
                <WhatStudentsSee />
              </aside>
            </div>
          )}
        </>
      )}

      <StudentPrintSheets sheets={printQueue.queue} />

      <Modal
        open={confirm !== null}
        title={
          confirm?.kind === 'renew'
            ? `Nouvelle fiche pour ${studentName(confirm.student)} ?`
            : confirm?.kind === 'remove'
              ? `Retirer ${studentName(confirm.student)} ?`
              : `Supprimer la classe ${confirm?.cls.title ?? ''} ?`
        }
        onClose={closeConfirm}
        footer={
          <>
            <Button size="md" variant="outline" onClick={closeConfirm} disabled={confirmPending}>
              Annuler
            </Button>
            <Button size="md" variant={confirm?.kind === 'renew' ? 'primary' : 'danger'} loading={confirmPending} onClick={() => void runConfirm()}>
              {confirm?.kind === 'renew' ? 'Créer une nouvelle fiche' : confirm?.kind === 'remove' ? 'Retirer l’élève' : 'Supprimer la classe'}
            </Button>
          </>
        }
      >
        <p className="text-[15px] font-semibold text-ink">
          {confirm?.kind === 'renew'
            ? RENEW_WARNING
            : confirm?.kind === 'remove'
              ? 'Son accès sera supprimé.'
              : 'Cette action est définitive.'}
        </p>
        {confirmError && (
          <div className="mt-3">
            <Alert tone="error">{confirmError}</Alert>
          </div>
        )}
      </Modal>

      <LeaveGuardModal blocker={blocker} message={PRINT_REMINDER} />
    </div>
  )
}
