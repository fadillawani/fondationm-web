import { useId, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Textarea } from '../../../components/ui/Textarea'
import type { ManagedClass } from '../classes/classData'
import { parseStudentLines, type ParsedName } from './bulkParse'
import { createStudentAccess, type CreatedAccess } from './establishmentData'
import { placesLine, studentErrorMessage } from './establishmentText'

interface Failure {
  line: number
  name: string
  message: string
  full: boolean
  created: number
}

interface BulkAddFormProps {
  cls: ManagedClass
  /** Places restantes avant l'effectif déclaré (null : effectif inconnu). */
  places: number | null
  suffix: string
  onCreated: (access: CreatedAccess) => void
  onEditClass: () => void
  onClose: () => void
}

const CELL =
  'h-11 w-full min-w-0 rounded-[10px] border-2 border-line bg-surface px-2.5 text-[15px] font-semibold text-ink focus:border-terra focus:outline-none focus:ring-[3px] focus:ring-terra/30'

/**
 * « Ajouter plusieurs élèves » (F6-Q1 b) : une personne par ligne, aperçu « Prénom | Nom » modifiable avant la
 * création, création une par une ; à la première erreur, arrêt, bilan et « Reprendre » pour les lignes restantes.
 */
export function BulkAddForm({ cls, places, suffix, onCreated, onEditClass, onClose }: BulkAddFormProps) {
  const id = useId()
  const [input, setInput] = useState('')
  const [rows, setRows] = useState<ParsedName[] | null>(null)
  /** Numéro de la première ligne de `rows` dans la saisie (les lignes créées sortent de l'aperçu). */
  const [firstLine, setFirstLine] = useState(1)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [finished, setFinished] = useState<number | null>(null)

  const incomplete = rows?.findIndex((row) => !row.firstName.trim() || !row.lastName.trim()) ?? -1
  const tooMany = rows !== null && places !== null && rows.length > places
  const busy = progress !== null

  function preview() {
    setFinished(null)
    setFailure(null)
    setFirstLine(1)
    setRows(parseStudentLines(input))
  }

  /** Retour à la saisie : seules les lignes non créées y reviennent. */
  function backToList() {
    if (rows !== null) setInput(rows.map((row) => `${row.firstName} ; ${row.lastName}`).join('\n'))
    setRows(null)
    setFailure(null)
    setFirstLine(1)
  }

  function edit(index: number, field: keyof ParsedName, value: string) {
    setRows((current) => current?.map((row, i) => (i === index ? { ...row, [field]: value } : row)) ?? null)
  }

  async function create() {
    if (rows === null || rows.length === 0 || incomplete !== -1 || tooMany) return
    setFailure(null)
    let remaining = rows
    let line = firstLine
    let created = 0
    setProgress({ done: 0, total: rows.length })
    while (remaining.length > 0) {
      const [row, ...rest] = remaining
      if (row === undefined) break
      try {
        onCreated(await createStudentAccess(cls.id, row.firstName.trim(), row.lastName.trim(), suffix))
      } catch (caught) {
        const { message, full } = studentErrorMessage(caught, cls)
        setFailure({ line, name: `${row.firstName} ${row.lastName}`.trim(), message, full, created })
        setRows(remaining)
        setFirstLine(line)
        setProgress(null)
        return
      }
      created += 1
      line += 1
      remaining = rest
      setProgress({ done: created, total: rows.length })
    }
    setProgress(null)
    setRows(null)
    setInput('')
    setFinished(created)
  }

  return (
    <section aria-labelledby={`${id}-titre`} className="flex flex-col gap-3 rounded-[18px] border-2 border-dashed border-line bg-surface p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`${id}-titre`} className="font-sans text-[15px] font-black text-ink">
          Ajouter plusieurs élèves
        </h3>
        {places !== null && <p className="text-[13px] font-extrabold text-muted">{placesLine(places)}</p>}
      </div>

      {finished !== null && (
        <p role="status" className="rounded-[12px] bg-[#E8EEDF] px-3 py-2 text-sm font-extrabold text-[#3B5221]">
          {finished > 1 ? `${finished} élèves ajoutés.` : `${finished} élève ajouté.`} Leurs fiches sont prêtes à imprimer.
        </p>
      )}

      {rows === null ? (
        <>
          <label htmlFor={`${id}-liste`} className="text-[13px] font-extrabold text-ink">
            Une personne par ligne : « Prénom Nom », ou « Prénom ; Nom » pour un prénom composé (collage depuis un tableur accepté)
          </label>
          <Textarea id={`${id}-liste`} rows={5} value={input} onChange={(event) => setInput(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button size="md" variant="secondary" onClick={preview} disabled={!input.trim()}>
              Voir l’aperçu
            </Button>
            <Button size="md" variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </>
      ) : (
        <>
          <table className="w-full table-fixed border-separate border-spacing-y-1.5">
            <caption className="sr-only">Aperçu des élèves à créer</caption>
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-[0.06em] text-muted">
                <th scope="col" className="w-10 pb-1">
                  Ligne
                </th>
                <th scope="col" className="pb-1">
                  Prénom
                </th>
                <th scope="col" className="pb-1 pl-2">
                  Nom
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const line = firstLine + index
                return (
                  <tr key={`${line}-${index}`}>
                    <td className="text-sm font-extrabold text-muted">{line}</td>
                    <td>
                      <input
                        aria-label={`Prénom, ligne ${line}`}
                        value={row.firstName}
                        onChange={(event) => edit(index, 'firstName', event.target.value)}
                        disabled={busy}
                        className={CELL}
                      />
                    </td>
                    <td className="pl-2">
                      <input
                        aria-label={`Nom, ligne ${line}`}
                        value={row.lastName}
                        onChange={(event) => edit(index, 'lastName', event.target.value)}
                        disabled={busy}
                        className={CELL}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {incomplete !== -1 && (
            <p className="text-sm font-extrabold text-red">Ligne {firstLine + incomplete} : indiquez le prénom et le nom.</p>
          )}
          {tooMany && (
            <div className="flex flex-wrap items-center gap-x-3 text-sm font-extrabold text-red">
              <span>
                {rows.length} lignes pour {placesLine(places ?? 0)} : retirez des lignes ou augmentez l’effectif.
              </span>
              <button type="button" onClick={onEditClass} className="min-h-touch font-black text-indigo underline underline-offset-2">
                Modifier la classe
              </button>
            </div>
          )}
          {failure !== null && (
            <div role="alert" className="flex flex-col gap-2 rounded-[12px] bg-[#FBE3E3] px-3 py-2.5 text-sm font-extrabold text-[#8E1518]">
              <p>
                {failure.created > 1 ? `${failure.created} élèves créés.` : `${failure.created} élève créé.`} Échec à la ligne{' '}
                {failure.line} ({failure.name}) : {failure.message} {rows.length > 1 ? `${rows.length} lignes restantes.` : '1 ligne restante.'}
              </p>
              {failure.full && (
                <button type="button" onClick={onEditClass} className="min-h-touch self-start font-black text-indigo underline underline-offset-2">
                  Modifier la classe
                </button>
              )}
            </div>
          )}
          {progress !== null && (
            <p role="status" className="text-sm font-extrabold text-muted">
              Création… {progress.done} sur {progress.total}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="md"
              variant="secondary"
              loading={busy}
              disabled={rows.length === 0 || incomplete !== -1 || tooMany}
              onClick={() => void create()}
            >
              {failure !== null ? 'Reprendre' : rows.length > 1 ? `Créer ${rows.length} élèves` : 'Créer 1 élève'}
            </Button>
            <Button size="md" variant="outline" disabled={busy} onClick={backToList}>
              Modifier la liste
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
