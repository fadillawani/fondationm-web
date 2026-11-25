import { useId, useState } from 'react'
import { errorFromException, errorMessage } from '../../../api/errors'
import { Alert } from '../../../components/ui/Alert'
import { Textarea } from '../../../components/ui/Textarea'
import { cn } from '../../../lib/cn'
import { useAnswerDonorRequest, type DonorRequest } from './donorsData'
import { REQUEST_BADGE, RESPONSE_MAX, RESPONSE_REQUIRED, answeredNote, irreversibleNote, shortDate } from './donorsText'

interface ListProps {
  requests: readonly DonorRequest[]
  selectedId: string | null
  onSelect: (request: DonorRequest) => void
}

/** Cartes-boutons des requêtes (maquette W3-requetes : rayon 18, bordure encre à la sélection). */
export function DonorRequestList({ requests, selectedId, onSelect }: ListProps) {
  return (
    <ul aria-label="Requêtes des donateurs" className="flex flex-col gap-2.5">
      {requests.map((request) => {
        const badge = REQUEST_BADGE[request.status]
        const selected = request.id === selectedId
        return (
          <li key={request.id}>
            <button
              type="button"
              onClick={() => onSelect(request)}
              aria-pressed={selected}
              className={cn(
                'flex w-full flex-col gap-1.5 rounded-[18px] border-2 bg-surface p-3.5 text-left text-ink lg:px-4',
                selected ? 'lg:border-ink' : 'border-transparent',
                'max-lg:border-transparent',
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-xs font-black text-muted">
                  {request.donorName} · {shortDate(request.createdAt)}
                </span>
                <span className={cn('rounded-pill px-2 py-[3px] text-[11px] font-black lg:px-[9px]', badge.className)}>{badge.label}</span>
              </span>
              <span className="font-display text-[17px] leading-[1.15] lg:text-lg">{request.subject}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

interface DetailProps {
  request: DonorRequest
  /** Fixe la requête dans l'URL avant l'envoi : le détail reste monté pendant le rechargement (décision 79). */
  onPin: () => void
}

/** Détail d'une requête : message du donateur, réponse unique de la Fondation, ou formulaire de réponse. */
export function DonorRequestDetail({ request: listed, onPin }: DetailProps) {
  const id = useId()
  const answer = useAnswerDonorRequest()
  const request = answer.data?.id === listed.id ? answer.data : listed
  const [draft, setDraft] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const badge = REQUEST_BADGE[request.status]

  function send() {
    const response = draft.trim()
    setError(null)
    if (response.length === 0) {
      setFieldError(RESPONSE_REQUIRED)
      return
    }
    if (response.length > RESPONSE_MAX) {
      setFieldError(`${RESPONSE_MAX} caractères maximum.`)
      return
    }
    setFieldError(null)
    onPin()
    answer.mutate(
      { id: request.id, response },
      {
        onError: (failure) => {
          const field = errorFromException(failure).fieldErrors.find((entry) => entry.field === 'response')
          if (field) setFieldError(field.message)
          else setError(errorMessage(failure))
        },
      },
    )
  }

  return (
    <article aria-labelledby={`${id}-objet`} className="flex flex-col gap-3 lg:gap-4 lg:rounded-[24px] lg:bg-surface lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={`${id}-objet`} className="text-xl leading-[1.1] lg:text-[25px]">
            {request.subject}
          </h2>
          <span className="text-[13px] font-bold text-muted lg:text-sm">{request.donorName}</span>
        </div>
        <span className={cn('rounded-pill px-2.5 py-1 text-xs font-black', badge.className)}>{badge.label}</span>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex max-w-[88%] flex-col gap-1 self-start rounded-[18px] bg-canvas p-3 text-ink lg:max-w-[85%] lg:px-3.5">
          <span className="text-[11px] font-black lg:text-xs">
            {request.donorName} · {shortDate(request.createdAt)}
          </span>
          <span className="whitespace-pre-line text-sm font-semibold leading-normal lg:text-[15px]">{request.message}</span>
        </div>
        {request.status === 'ANSWERED' && request.response && (
          <div className="flex max-w-[88%] flex-col gap-1 self-end rounded-[18px] bg-indigo p-3 text-white lg:max-w-[85%] lg:px-3.5">
            <span className="text-[11px] font-black lg:text-xs">Fondation M · {shortDate(request.answeredAt)}</span>
            <span className="whitespace-pre-line text-sm font-semibold leading-normal lg:text-[15px]">{request.response}</span>
          </div>
        )}
      </div>

      {request.status === 'OPEN' ? (
        <form
          noValidate
          aria-label="Répondre à la requête"
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
          className="flex flex-col gap-2.5 rounded-[18px] bg-surface p-3.5 lg:rounded-none lg:border-t lg:border-[#EDE6D6] lg:p-0 lg:pt-3"
        >
          <label htmlFor={`${id}-reponse`} className="text-sm font-black">
            Votre réponse
          </label>
          <Textarea
            id={`${id}-reponse`}
            rows={5}
            value={draft}
            maxLength={RESPONSE_MAX}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Bonjour, merci pour votre message…"
            aria-invalid={fieldError !== null}
            aria-describedby={`${id}-compteur${fieldError ? ` ${id}-erreur` : ''}`}
          />
          <div className="flex flex-wrap justify-between gap-2">
            {fieldError ? (
              <p id={`${id}-erreur`} className="text-sm font-bold text-red">
                {fieldError}
              </p>
            ) : (
              <span />
            )}
            <p id={`${id}-compteur`} aria-live="polite" className="text-xs font-bold text-muted">
              {draft.length} / {RESPONSE_MAX}
            </p>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <button
            type="submit"
            disabled={answer.isPending}
            aria-busy={answer.isPending || undefined}
            className="inline-flex min-h-[52px] items-center justify-center rounded-button bg-terra font-display text-lg text-white disabled:opacity-60 lg:min-h-[54px] lg:text-[19px]"
          >
            Envoyer la réponse
          </button>
          <p className="text-[13px] font-bold text-muted">{irreversibleNote(request.donorName)}</p>
        </form>
      ) : (
        <p role={answer.isSuccess ? 'status' : undefined} className="rounded-[12px] bg-[#E8EEDF] px-3.5 py-3 text-[13px] font-extrabold text-[#3B5221] lg:text-sm">
          {answeredNote(request.donorName)}
        </p>
      )}
    </article>
  )
}
