import { useState } from 'react'
import { errorMessage } from '../../api/errors'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Initials } from '../../components/ui/Initials'
import { formatDate } from '../../lib/formatDate'
import { SCHOOL_TYPE_LABELS, SECTOR_LABELS } from '../../lib/referenceData'
import { applyServerFieldErrors } from '../../lib/serverFieldErrors'
import { isAlreadyProcessed, useRejectAccount, useValidateAccount, type Account } from './accounts'
import { STATUS_BADGE, contextLine, kindLabel } from './accountText'
import { RejectForm, type RejectValues } from './RejectForm'
import { ResultBlock } from './ResultBlock'

interface Fact {
  label: string
  value: string | null
}

function factsOf(account: Account): Fact[] {
  const details = account.details
  const charter = { label: 'Charte acceptée le', value: formatDate(details?.charterAcceptedAt ?? null) }
  if (details?.kind === 'school') {
    return [
      { label: 'Ville', value: details.city },
      { label: 'Pays', value: details.country },
      { label: "Type d'établissement", value: details.schoolType ? SCHOOL_TYPE_LABELS[details.schoolType] : null },
      { label: 'Fonction du référent', value: details.referentRole },
      { label: 'E-mail', value: account.email },
      { label: 'Téléphone', value: details.phone },
      charter,
    ]
  }
  if (details?.kind === 'speaker') {
    return [
      { label: 'Ville', value: details.city },
      { label: 'Pays', value: details.country },
      { label: 'Secteur', value: details.sector ? SECTOR_LABELS[details.sector].name : null },
      { label: 'Métier', value: details.jobTitle },
      { label: 'Structure', value: details.organization },
      { label: 'E-mail', value: account.email },
      { label: 'Téléphone', value: details.phone },
      charter,
    ]
  }
  return [{ label: 'E-mail', value: account.email }]
}

interface AccountDetailProps {
  account: Account
  /** Action réussie : compte renvoyé par le serveur (ou, à défaut, le compte avec son nouveau statut). */
  onProcessed: (account: Account) => void
  /** 409 : le compte a déjà été traité. */
  onConflict: () => void
}

export function AccountDetail({ account, onProcessed, onConflict }: AccountDetailProps) {
  const [rejecting, setRejecting] = useState(false)
  const validate = useValidateAccount()
  const reject = useRejectAccount()
  const [actionError, setActionError] = useState<string | null>(null)
  const status = STATUS_BADGE[account.status]
  const sent = formatDate(account.createdAt)
  const context = contextLine(account)
  const facts = factsOf(account).filter((fact): fact is { label: string; value: string } => Boolean(fact.value))
  const details = account.details
  const busy = validate.isPending || reject.isPending

  function failed(error: unknown): boolean {
    if (isAlreadyProcessed(error)) {
      onConflict()
      return true
    }
    return false
  }

  function handleValidate() {
    setActionError(null)
    validate.mutate(account.id, {
      onSuccess: (result) => onProcessed(result ?? { ...account, status: 'VALIDATED' }),
      onError: (error) => {
        if (!failed(error)) setActionError(errorMessage(error))
      },
    })
  }

  function handleReject(values: RejectValues, setServerError: (message: string) => void) {
    setActionError(null)
    reject.mutate(
      { id: account.id, reason: values.reason },
      {
        onSuccess: (result) =>
          onProcessed(result ?? { ...account, status: 'REJECTED', rejectionReason: values.reason }),
        onError: (error) => {
          if (failed(error)) return
          const placed = applyServerFieldErrors<RejectValues>(error, (_name, { message }) => setServerError(message ?? ''), {
            fields: ['reason'],
          })
          if (!placed) setActionError(errorMessage(error))
        },
      },
    )
  }

  return (
    <article aria-labelledby={`compte-${account.id}`} className="flex flex-col gap-5 rounded-card bg-surface p-5 shadow-card lg:p-7">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-muted">
          {kindLabel(account)}
          {sent && ` · demande envoyée le ${sent}`}
        </p>
        <Badge tone={status.tone}>{status.label}</Badge>
      </header>

      <div className="flex items-center gap-4">
        <Initials name={account.name} tone={account.role === 'SCHOOL' ? 'school' : 'speaker'} size="lg" />
        <div className="min-w-0">
          <h2 id={`compte-${account.id}`} className="text-2xl leading-tight text-ink md:text-[28px]">
            {account.name}
          </h2>
          {context && <p className="font-semibold text-muted">{context}</p>}
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col">
            <dt className="text-xs font-black uppercase tracking-[0.08em] text-muted">{fact.label}</dt>
            <dd className="break-words font-bold text-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {details?.kind === 'speaker' && details.skills.length > 0 && (
        <section aria-labelledby={`competences-${account.id}`} className="flex flex-col gap-2">
          <h3 id={`competences-${account.id}`} className="text-lg">
            Compétences déclarées
          </h3>
          <ul className="flex flex-wrap gap-2">
            {details.skills.map((skill) => (
              <li key={skill} className="rounded-pill bg-cream px-3 py-1 text-sm font-extrabold text-ink">
                {skill}
              </li>
            ))}
          </ul>
        </section>
      )}

      {details?.kind === 'speaker' && details.motivation && (
        <section aria-labelledby={`motivation-${account.id}`} className="flex flex-col gap-2">
          <h3 id={`motivation-${account.id}`} className="text-lg">
            Pourquoi il ou elle veut transmettre
          </h3>
          <blockquote className="whitespace-pre-line rounded-block border-l-[6px] border-orange bg-canvas px-4 py-3 font-semibold italic text-ink">
            {details.motivation}
          </blockquote>
        </section>
      )}

      {actionError && <Alert tone="error">{actionError}</Alert>}

      {account.status === 'PENDING' ? (
        rejecting ? (
          <RejectForm submitting={reject.isPending} onSubmit={handleReject} onCancel={() => setRejecting(false)} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="success" size="md" loading={validate.isPending} disabled={busy} onClick={handleValidate}>
              Valider le compte
            </Button>
            <Button variant="outline" size="md" disabled={busy} onClick={() => setRejecting(true)}>
              Refuser
            </Button>
          </div>
        )
      ) : (
        <ResultBlock account={account} />
      )}
    </article>
  )
}
