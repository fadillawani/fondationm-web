import { useState } from 'react'
import { errorMessage } from '../../api/errors'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Initials } from '../../components/ui/Initials'
import { parseIso } from '../../lib/dateTime'
import { formatDate } from '../../lib/formatDate'
import { SCHOOL_TYPE_LABELS, SECTOR_LABELS } from '../../lib/referenceData'
import { applyServerFieldErrors } from '../../lib/serverFieldErrors'
import { isAlreadyProcessed, useRejectAccount, useValidateAccount, type Account } from './accounts'
import { STATUS_BADGE, detailLine, kindLabel } from './accountText'
import { RejectForm, type RejectValues } from './RejectForm'
import { ResultBlock } from './ResultBlock'

interface Fact {
  label: string
  value: string | null
}

const DAY_MS = 86_400_000

/** « Validé le » / « Refusé le » et « Délai » (maquette, comptes traités) : calculés depuis createdAt et decidedAt. */
function decisionFacts(account: Account): Fact[] {
  if (account.status === 'PENDING') return []
  const decided = parseIso(account.decidedAt)
  const created = parseIso(account.createdAt)
  const days = decided && created ? Math.max(0, Math.round((decided.getTime() - created.getTime()) / DAY_MS)) : null
  return [
    { label: account.status === 'VALIDATED' ? 'Validé le' : 'Refusé le', value: formatDate(account.decidedAt) },
    { label: 'Délai', value: days === null ? null : `${days} jour${days > 1 ? 's' : ''}` },
  ]
}

/**
 * Faits de la maquette en tête (école : Ville, Type, Fonction ; intervenant : Zone, Secteur, Structure),
 * puis les données utiles à la vérification (pays, coordonnées, charte), absentes de la maquette.
 */
function factsOf(account: Account): Fact[] {
  const details = account.details
  const charter = { label: 'Charte acceptée le', value: formatDate(details?.charterAcceptedAt ?? null) }
  if (details?.kind === 'school') {
    return [
      { label: 'Ville', value: details.city },
      { label: 'Type', value: details.schoolType ? SCHOOL_TYPE_LABELS[details.schoolType] : null },
      { label: 'Fonction', value: details.referentRole },
      ...decisionFacts(account),
      { label: 'Pays', value: details.country },
      { label: 'E-mail', value: account.email },
      { label: 'Téléphone', value: details.phone },
      charter,
    ]
  }
  if (details?.kind === 'speaker') {
    return [
      { label: 'Zone', value: details.city },
      { label: 'Secteur', value: details.sector ? SECTOR_LABELS[details.sector].name : null },
      { label: 'Structure', value: details.organization },
      ...decisionFacts(account),
      { label: 'Pays', value: details.country },
      { label: 'Métier', value: details.jobTitle },
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
  const context = detailLine(account)
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
    <article
      aria-labelledby={`compte-${account.id}`}
      className="flex flex-col gap-4 rounded-[22px] bg-surface p-[18px] lg:gap-5 lg:rounded-[24px] lg:p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-muted lg:text-[13px]">
          <span className="hidden lg:inline">
            {kindLabel(account)}
            {sent && ` · demande envoyée le ${sent}`}
          </span>
          <span className="lg:hidden">{sent ? `Envoyée le ${sent}` : kindLabel(account)}</span>
        </p>
        <Badge tone={status.tone} size="md">
          {status.label}
        </Badge>
      </header>

      <div className="flex items-center gap-3.5">
        <Initials name={account.name} tone={account.role === 'SCHOOL' ? 'school' : 'speaker'} size="detail" photoUrl={account.details?.photoUrl} />
        <div className="min-w-0">
          <h2 id={`compte-${account.id}`} className="text-[23px] leading-tight text-ink lg:text-[28px]">
            {account.name}
          </h2>
          {context && <p className="text-[13px] font-extrabold text-muted lg:text-[15px]">{context}</p>}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 lg:gap-2.5">
        {facts.map((fact) => (
          <div key={fact.label} className="flex min-w-0 flex-col rounded-[12px] bg-canvas p-2.5 lg:rounded-[14px] lg:px-3.5 lg:py-3">
            <dt className="text-[10px] font-black uppercase text-muted lg:text-[11px]">{fact.label}</dt>
            <dd className="break-words text-sm font-black text-ink lg:text-[15px]">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {details?.kind === 'speaker' && details.skills.length > 0 && (
        <section aria-labelledby={`competences-${account.id}`} className="flex flex-col gap-2">
          <h3 id={`competences-${account.id}`} className="font-sans text-[13px] font-black">
            Compétences déclarées
          </h3>
          <ul className="flex flex-wrap gap-2">
            {details.skills.map((skill) => (
              <li key={skill} className="rounded-pill bg-ink px-2.5 py-1 text-xs font-extrabold text-cream lg:px-3 lg:py-[5px] lg:text-[13px]">
                {skill}
              </li>
            ))}
          </ul>
        </section>
      )}

      {details?.kind === 'speaker' && details.motivation && (
        <section aria-labelledby={`motivation-${account.id}`} className="flex flex-col gap-1.5">
          <blockquote className="whitespace-pre-line rounded-[12px] bg-cream p-3 text-sm font-semibold text-ink lg:rounded-[14px] lg:px-4 lg:py-3.5 lg:text-[15px]">
            « {details.motivation} »
          </blockquote>
          {/* Maquette : « Pourquoi il / elle veut transmettre » ; le genre n'est pas connu. */}
          <h3 id={`motivation-${account.id}`} className="font-sans text-xs font-black">
            Pourquoi il ou elle veut transmettre
          </h3>
        </section>
      )}

      {actionError && <Alert tone="error">{actionError}</Alert>}

      {account.status === 'PENDING' ? (
        rejecting ? (
          <RejectForm submitting={reject.isPending} onSubmit={handleReject} onCancel={() => setRejecting(false)} />
        ) : (
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button
              variant="success"
              loading={validate.isPending}
              disabled={busy}
              onClick={handleValidate}
              className="min-h-[54px] flex-1 text-[19px]"
            >
              Valider le compte
            </Button>
            <Button
              variant="outlineInk"
              disabled={busy}
              onClick={() => setRejecting(true)}
              className="min-h-[50px] font-sans text-[15px] font-black lg:min-h-[54px]"
            >
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
