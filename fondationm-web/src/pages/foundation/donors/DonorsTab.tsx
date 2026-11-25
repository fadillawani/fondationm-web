import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { errorFromException, errorMessage } from '../../../api/errors'
import { LeaveGuardModal } from '../../../components/access/LeaveGuardModal'
import { PrintSheets, SheetBody } from '../../../components/access/AccessSheet'
import { useLeaveGuard } from '../../../components/access/useLeaveGuard'
import { usePrintQueue } from '../../../components/access/usePrintQueue'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { ChoiceGroup } from '../../../components/ui/ChoiceGroup'
import { ErrorState } from '../../../components/ui/ErrorState'
import { FormField } from '../../../components/ui/FormField'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { Spinner } from '../../../components/ui/Spinner'
import { plural } from '../meetings/foundationMeetingState'
import { DONORS_KEY, createDonorAccount, renewDonorCode, type Donor, type DonorAccess } from './donorsData'
import {
  DONOR_ACCESS_NOTE,
  DONOR_CREATE_HINT,
  DONOR_PRINT_FOOTER,
  DONOR_PRINT_REMINDER,
  EMAIL_TAKEN,
  RENEW_DONOR_WARNING,
  consultationLine,
} from './donorsText'

interface DonorSheet {
  key: string
  name: string
  login: string
  code: string
  printed: boolean
}

function sheetOf(access: DonorAccess): DonorSheet {
  return { key: access.id, name: access.name, login: access.email || 'Adresse e-mail du compte', code: access.code, printed: false }
}

const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Création d'un compte donateur : nom et e-mail ; le code temporaire est généré à l'envoi. */
function CreateDonorForm({ onCreated, onCancel }: { onCreated: (access: DonorAccess) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({})
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = name.trim()
    const cleanEmail = email.trim()
    const next: typeof errors = {}
    if (!cleanName) next.name = 'Indiquez le nom du donateur ou de l’organisation.'
    else if (cleanName.length > 200) next.name = '200 caractères maximum.'
    if (!cleanEmail) next.email = 'Indiquez une adresse e-mail.'
    else if (!EMAIL_RULE.test(cleanEmail) || cleanEmail.length > 254) next.email = 'Cette adresse e-mail ne semble pas valide.'
    setErrors(next)
    if (next.name || next.email) return
    setPending(true)
    try {
      onCreated(await createDonorAccount(cleanName, cleanEmail))
    } catch (failure) {
      const apiError = errorFromException(failure)
      if (apiError.code === 'EMAIL_ALREADY_USED') {
        setErrors({ email: EMAIL_TAKEN })
      } else {
        const fields: typeof errors = {}
        for (const entry of apiError.fieldErrors) {
          if (entry.field === 'name' || entry.field === 'email') fields[entry.field] = entry.message
        }
        setErrors(fields.name || fields.email ? fields : { form: errorMessage(failure) })
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form noValidate aria-label="Créer un compte donateur" onSubmit={(event) => void submit(event)} className="flex flex-col gap-3 rounded-[18px] bg-surface p-4 lg:p-5">
      <h3 className="text-xl">Créer un compte donateur</h3>
      <p className="text-[13px] font-bold text-muted">{DONOR_CREATE_HINT}</p>
      <FormField label="Nom du donateur ou de l’organisation" required error={errors.name}>
        {(control) => <Input {...control} value={name} onChange={(event) => setName(event.target.value)} maxLength={200} autoComplete="off" />}
      </FormField>
      <FormField label="E-mail" required error={errors.email}>
        {(control) => (
          <Input {...control} type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="off" />
        )}
      </FormField>
      {errors.form && <Alert tone="error">{errors.form}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="md" loading={pending}>
          Créer le compte
        </Button>
        <Button size="md" variant="outline" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

interface DonorsTabProps {
  donors: { items: readonly Donor[]; truncated: boolean } | undefined
  isPending: boolean
  error: unknown
  onRetry: () => void
  retrying: boolean
}

/**
 * Onglet « Donateurs » (sans maquette) : comptes donateurs et leurs consultations, création d'un compte avec fiche
 * d'accès à remettre (code affiché une seule fois, dans l'état de cet onglet), « Nouveau code ».
 */
export function DonorsTab({ donors, isPending, error, onRetry, retrying }: DonorsTabProps) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'tous' | 'jamais'>('tous')
  const [creating, setCreating] = useState(false)
  const [sheets, setSheets] = useState<ReadonlyMap<string, DonorSheet>>(new Map())
  const [shown, setShown] = useState<string | null>(null)
  const [renewing, setRenewing] = useState<Donor | null>(null)
  const [renewError, setRenewError] = useState<string | null>(null)
  const [renewPending, setRenewPending] = useState(false)
  const printQueue = usePrintQueue<DonorSheet>()
  const unprinted = [...sheets.values()].some((sheet) => !sheet.printed)
  const blocker = useLeaveGuard(unprinted)
  const sheet = shown === null ? undefined : sheets.get(shown)
  const items = (donors?.items ?? []).filter((donor) => filter === 'tous' || donor.lastConsultedAt === null)

  function keep(access: DonorAccess) {
    setSheets((current) => new Map(current).set(access.id, sheetOf(access)))
    setShown(access.id)
    // Liste rechargée ; si le rechargement échoue, la fiche reste affichée (le code n'est pas rejouable).
    void queryClient.invalidateQueries({ queryKey: DONORS_KEY })
    void queryClient.invalidateQueries({ queryKey: ['foundation', 'indicateurs'] })
  }

  async function renew() {
    if (renewing === null) return
    setRenewPending(true)
    setRenewError(null)
    try {
      keep(await renewDonorCode(renewing))
      setRenewing(null)
    } catch (failure) {
      setRenewError(errorMessage(failure))
    } finally {
      setRenewPending(false)
    }
  }

  function print(target: DonorSheet) {
    printQueue.print([target], (printed) =>
      setSheets((current) => {
        const next = new Map(current)
        for (const entry of printed) next.set(entry.key, { ...entry, printed: true })
        return next
      }),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {unprinted && (
        <p role="status" className="rounded-[14px] border-2 border-yellow bg-cream px-4 py-3 text-sm font-extrabold text-ink">
          {DONOR_PRINT_REMINDER}
        </p>
      )}

      {sheet && (
        <section aria-label="Fiche d'accès" className="flex flex-col gap-2.5 rounded-[20px] bg-yellow p-4 text-ink lg:max-w-[460px] lg:gap-3 lg:rounded-[24px] lg:p-5">
          <SheetBody sheet={sheet} note={DONOR_ACCESS_NOTE} />
          <button
            type="button"
            onClick={() => print(sheet)}
            className="inline-flex min-h-touch items-center justify-center self-start rounded-[12px] bg-ink px-3.5 text-[13px] font-black text-cream"
          >
            Imprimer la fiche
          </button>
        </section>
      )}

      {creating ? (
        <CreateDonorForm
          onCreated={(access) => {
            setCreating(false)
            keep(access)
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <Button size="md" className="self-start" onClick={() => setCreating(true)}>
          Créer un compte donateur
        </Button>
      )}

      <ChoiceGroup
        label="Afficher"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'tous', label: 'Tous' },
          { value: 'jamais', label: 'Jamais consultés' },
        ]}
      />

      {isPending ? (
        <div className="flex justify-center py-8 text-terra">
          <Spinner label="Chargement des donateurs…" />
        </div>
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={onRetry} retrying={retrying} />
      ) : items.length === 0 ? (
        <p className="rounded-[18px] bg-surface p-4 font-bold text-muted">
          {filter === 'jamais'
            ? 'Tous les donateurs ont déjà consulté leur espace.'
            : 'Aucun compte donateur pour l’instant. Créez le premier pour qu’un mécène suive son impact.'}
        </p>
      ) : (
        <ul aria-label="Comptes donateurs" className="flex flex-col gap-2.5">
          {items.map((donor) => (
            <li key={donor.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-surface p-3.5 lg:px-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-display text-lg leading-[1.15]">{donor.name}</span>
                {donor.email && <span className="text-[13px] font-bold text-muted">{donor.email}</span>}
                <span className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
                  {donor.lastConsultedAt === null ? (
                    <span className="rounded-pill bg-[#EDE6D6] px-2 py-0.5 font-black text-muted">Jamais consulté</span>
                  ) : (
                    consultationLine(donor.lastConsultedAt)
                  )}
                  <span>· {plural(donor.consultationCount, 'consultation', 'consultations')}</span>
                </span>
              </div>
              {sheets.has(donor.id) ? (
                <Button size="md" variant="outline" onClick={() => setShown(donor.id)} aria-label={`Voir la fiche de ${donor.name}`}>
                  Voir la fiche
                </Button>
              ) : (
                <Button size="md" variant="outlineInk" onClick={() => setRenewing(donor)} aria-label={`Nouveau code pour ${donor.name}`}>
                  Nouveau code
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <PrintSheets sheets={printQueue.queue} footer={DONOR_PRINT_FOOTER} />

      <Modal
        open={renewing !== null}
        title={`Nouveau code pour ${renewing?.name ?? ''} ?`}
        onClose={() => {
          setRenewing(null)
          setRenewError(null)
        }}
        footer={
          <>
            <Button size="md" variant="outline" onClick={() => setRenewing(null)} disabled={renewPending}>
              Annuler
            </Button>
            <Button size="md" loading={renewPending} onClick={() => void renew()}>
              Créer un nouveau code
            </Button>
          </>
        }
      >
        <p className="text-[15px] font-semibold text-ink">{RENEW_DONOR_WARNING}</p>
        {renewError && (
          <div className="mt-3">
            <Alert tone="error">{renewError}</Alert>
          </div>
        )}
      </Modal>

      <LeaveGuardModal blocker={blocker} message={DONOR_PRINT_REMINDER} />
    </div>
  )
}
