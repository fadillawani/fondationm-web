import { useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { errorFromException, errorMessage } from '../../api/errors'
import { LeaveGuardModal } from '../../components/access/LeaveGuardModal'
import { useLeaveGuard } from '../../components/access/useLeaveGuard'
import { PageTitle } from '../../components/layout/PageTitle'
import { BackIcon } from '../../components/layout/icons'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/ErrorState'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import { Textarea } from '../../components/ui/Textarea'
import { cn } from '../../lib/cn'
import { useMyDonorRequests, useRefetchMyRequests, useSendDonorRequest, type DonorRequest } from './donorData'
import {
  MESSAGE_MAX,
  STEP_HINT,
  STEP_LOOK,
  SUBJECT_MAX,
  findSentDuplicate,
  followUpSubject,
  requestStep,
  shortDate,
  sortRequests,
  truncate,
  type RequestStep,
} from './donorModel'

interface DetailState {
  fromList?: boolean
}

const SENT = 'Votre requête est partie. La Fondation M vous répondra ici.'
const STEPS: readonly RequestStep[] = ['Envoyée', 'Traitée']

function StepBadge({ step }: { step: RequestStep }) {
  return <span className={cn('shrink-0 rounded-pill px-2.5 py-1 text-xs font-black', STEP_LOOK[step])}>{step}</span>
}

function RequestList({ requests, selectedId, onSelect }: { requests: readonly DonorRequest[]; selectedId: string | null; onSelect: (request: DonorRequest) => void }) {
  return (
    <ul aria-label="Mes requêtes" className="flex flex-col gap-2">
      {requests.map((request) => {
        const step = requestStep(request)
        const selected = request.id === selectedId
        return (
          <li key={request.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(request)}
              className={cn(
                'flex w-full flex-col gap-1 rounded-[18px] border-2 bg-surface px-4 py-3 text-left',
                selected ? 'border-green' : 'border-transparent hover:border-line',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-muted">{shortDate(request.createdAt) ?? ''}</span>
                <StepBadge step={step} />
              </span>
              <span className="font-display text-lg leading-tight text-ink">{request.subject}</span>
              <span className="text-[13px] font-bold text-muted">{STEP_HINT[step]}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function RequestDetail({ request, justSent, onFollowUp }: { request: DonorRequest; justSent: boolean; onFollowUp: () => void }) {
  const step = requestStep(request)
  const current = STEPS.indexOf(step)
  return (
    <article aria-label={request.subject} className="flex flex-col gap-4 rounded-[20px] bg-surface p-4 lg:p-5">
      <div aria-live="polite" className="empty:hidden">
        {justSent && <p className="rounded-block border-l-[6px] border-green bg-green-tint px-4 py-3 text-sm font-semibold text-green">{SENT}</p>}
      </div>
      <div className="flex flex-col gap-1">
        {shortDate(request.createdAt) && <span className="text-xs font-black uppercase text-muted">Envoyée le {shortDate(request.createdAt)}</span>}
        <h2 className="text-[22px] lg:text-[26px]">{request.subject}</h2>
      </div>
      <ol aria-label="Suivi de la requête" className="grid grid-cols-2 gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === current ? 'step' : undefined}
            className={cn('flex flex-col gap-1.5 text-[13px]', index === current ? 'font-black text-ink' : index < current ? 'font-bold text-ink' : 'font-bold text-muted')}
          >
            <span aria-hidden="true" className={cn('h-1.5 rounded-pill', index <= current ? (step === 'Traitée' ? 'bg-green' : 'bg-orange') : 'bg-[#EDE6D6]')} />
            {label}
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 self-end rounded-[16px] bg-canvas px-4 py-3 lg:max-w-[85%]">
          <span className="text-xs font-black text-muted">Vous{shortDate(request.createdAt) ? ` · ${shortDate(request.createdAt)}` : ''}</span>
          <p className="whitespace-pre-line text-sm font-semibold text-ink">{request.message}</p>
        </div>
        {request.response ? (
          <div className="flex flex-col gap-1 self-start rounded-[16px] bg-indigo px-4 py-3 text-white lg:max-w-[85%]">
            <span className="text-xs font-black">Fondation M{shortDate(request.answeredAt) ? ` · ${shortDate(request.answeredAt)}` : ''}</span>
            <p className="whitespace-pre-line text-sm font-semibold">{request.response}</p>
          </div>
        ) : (
          <p className="rounded-[14px] bg-canvas px-4 py-3 text-sm font-bold text-muted">La Fondation M n'a pas encore répondu. Sa réponse s'affichera ici.</p>
        )}
      </div>
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <p className="text-sm font-black text-ink">Besoin d'un complément ?</p>
        <Button size="md" variant="outlineInk" className="self-start" onClick={onFollowUp}>
          Envoyer une nouvelle requête
        </Button>
      </div>
    </article>
  )
}

interface NewRequestFormProps {
  initialSubject: string
  onSent: (request: DonorRequest) => void
  onCancel: () => void
}

/** « Nouvelle requête » (décisions 104 et 105) : contrôles, compteurs, envoi unique, texte jamais perdu. */
function NewRequestForm({ initialSubject, onSent, onCancel }: NewRequestFormProps) {
  const send = useSendDonorRequest()
  const refetch = useRefetchMyRequests()
  const [subject, setSubject] = useState(initialSubject)
  const [message, setMessage] = useState('')
  const [missing, setMissing] = useState(false)
  const [failure, setFailure] = useState<unknown>(null)
  const [checking, setChecking] = useState(false)
  const [done, setDone] = useState(false)
  const busy = send.isPending || checking
  const dirty = !done && (subject !== initialSubject || message !== '')
  const blocker = useLeaveGuard(dirty)
  const sending = useRef(false)

  const fieldErrors = failure === null ? [] : errorFromException(failure).fieldErrors
  const subjectError = fieldErrors.find((error) => error.field === 'subject')?.message
  const messageError = fieldErrors.find((error) => error.field === 'message')?.message
  const otherFieldErrors = fieldErrors.filter((error) => error.field !== 'subject' && error.field !== 'message')

  function submit() {
    if (sending.current) return
    const body = { subject: subject.trim(), message: message.trim() }
    if (body.subject === '' || body.message === '') {
      setMissing(true)
      return
    }
    setMissing(false)
    setFailure(null)
    sending.current = true
    const startedAt = new Date()
    send.mutate(body, {
      onSuccess: (created) => {
        sending.current = false
        setDone(true)
        onSent(created)
      },
      onError: (error) => {
        if (errorFromException(error).fieldErrors.length > 0) {
          sending.current = false
          setFailure(error)
          return
        }
        // La requête a pu partir malgré l'erreur : relecture, sans renvoi automatique.
        setChecking(true)
        refetch()
          .then((list) => {
            const sent = findSentDuplicate(list.items, body, startedAt)
            if (sent === null) {
              setFailure(error)
              return
            }
            setDone(true)
            onSent(sent)
          })
          .catch(() => setFailure(error))
          .finally(() => {
            sending.current = false
            setChecking(false)
          })
      },
    })
  }

  return (
    <form
      noValidate
      aria-label="Nouvelle requête"
      className="flex flex-col gap-4 rounded-[20px] bg-surface p-4 lg:p-5"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] lg:text-[26px]">Nouvelle requête</h2>
        <p className="text-sm font-bold text-muted">Posez votre question comme vous le feriez par e-mail. Pas de catégorie à choisir.</p>
      </div>
      <FormField label="Objet" required error={subjectError}>
        {(control) => (
          <>
            <Input {...control} value={subject} maxLength={SUBJECT_MAX} placeholder="Ex. : Visiter une rencontre à Thiès" onChange={(event) => setSubject(event.target.value)} />
            <span className="self-end text-xs font-bold text-muted">
              {subject.length} / {SUBJECT_MAX}
              {' '}
              <span className="sr-only">caractères</span>
            </span>
          </>
        )}
      </FormField>
      <FormField label="Message" required error={messageError}>
        {(control) => (
          <>
            <Textarea {...control} rows={6} className="h-auto py-3" value={message} maxLength={MESSAGE_MAX} placeholder="Bonjour, …" onChange={(event) => setMessage(event.target.value)} />
            <span className="self-end text-xs font-bold text-muted">
              {message.length} / {MESSAGE_MAX}
              {' '}
              <span className="sr-only">caractères</span>
            </span>
          </>
        )}
      </FormField>
      {missing && <Alert tone="error">Ajoutez un objet et un message pour envoyer votre requête.</Alert>}
      {failure !== null && (subjectError === undefined && messageError === undefined) && (
        <Alert tone="error">
          {errorMessage(failure)}
          {otherFieldErrors.length > 0 && (
            <ul className="list-disc pl-5">
              {otherFieldErrors.map((error) => (
                <li key={`${error.field}-${error.message}`}>{error.message}</li>
              ))}
            </ul>
          )}
          {fieldErrors.length === 0 && ' Votre texte est conservé : vérifiez la liste avant de renvoyer.'}
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="md" variant="success" loading={busy} disabled={busy}>
          Envoyer à la Fondation
        </Button>
        <Button type="button" size="md" variant="outline" onClick={onCancel} disabled={busy}>
          Annuler
        </Button>
      </div>
      <LeaveGuardModal
        blocker={blocker}
        title="Quitter sans envoyer ?"
        stayLabel="Rester sur la page"
        message="Votre requête n'est pas encore envoyée. Le texte saisi sera perdu."
      />
    </form>
  )
}

/**
 * « Mes requêtes » du donateur (maquette W4-requetes). URL : `?requete={id}`, `?vue=nouvelle` (formulaire),
 * `?objet=` (objet prérempli d'un complément ou d'une question sur un retour).
 */
export function RequestsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const requests = useMyDonorRequests()
  const [sentId, setSentId] = useState<string | null>(null)
  const list = sortRequests(requests.data?.items ?? [])
  const creating = params.get('vue') === 'nouvelle'
  const selectedId = params.get('requete')
  const explicit = selectedId === null ? undefined : list.find((request) => request.id === selectedId)
  const current = explicit ?? list[0]
  const panelOpen = creating || explicit !== undefined
  const initialSubject = truncate(params.get('objet') ?? '', SUBJECT_MAX)

  function update(changes: Record<string, string | null>, { replace = false, state }: { replace?: boolean; state?: DetailState } = {}) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace, state })
  }

  function openForm(subject: string | null) {
    setSentId(null)
    update({ vue: 'nouvelle', objet: subject, requete: null }, { state: { fromList: true } })
  }

  function back() {
    const state = location.state as DetailState | null
    if (state?.fromList === true) void navigate(-1)
    else update({ requete: null, vue: null, objet: null }, { replace: true })
  }

  const newButton = (
    <Button size="md" variant="success" onClick={() => openForm(null)}>
      + Nouvelle requête
    </Button>
  )

  return (
    <div className="flex flex-col gap-3 lg:gap-[18px]">
      <div className={cn('flex flex-col gap-3', panelOpen && 'hidden lg:flex')}>
        <PageTitle
          kicker="Mes requêtes"
          title="Une question ? On vous répond ici"
          subtitle="Écrivez librement à la Fondation et suivez la réponse, sans échange hors plateforme."
          mobileSubtitle="La Fondation M répond à chaque requête."
          actions={newButton}
        />
        <div className="lg:hidden">{newButton}</div>
        <p className="hidden rounded-[14px] bg-cream px-4 py-3 text-[13px] font-bold text-ink lg:block">La Fondation M lit et répond à chaque requête ici.</p>
      </div>

      {requests.isPending ? (
        <div className="flex justify-center py-10 text-terra">
          <Spinner label="Chargement des requêtes…" size="lg" />
        </div>
      ) : requests.isError ? (
        <ErrorState message={errorMessage(requests.error)} onRetry={() => void requests.refetch()} retrying={requests.isFetching} />
      ) : (
        <div className="flex flex-col gap-3">
          {requests.data.truncated && <Alert tone="warning">Toutes les requêtes n'ont pas pu être chargées.</Alert>}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
            <div className={cn('flex flex-col gap-2.5', panelOpen && 'hidden lg:flex')}>
              {list.length === 0 ? (
                <p className="rounded-[18px] bg-surface p-4 font-bold text-muted">Aucune requête pour l'instant. Posez votre première question.</p>
              ) : (
                <RequestList
                  requests={list}
                  selectedId={creating ? null : (current?.id ?? null)}
                  onSelect={(request) => {
                    setSentId(null)
                    update({ requete: request.id, vue: null, objet: null }, { state: { fromList: true } })
                  }}
                />
              )}
            </div>
            {(creating || current) && (
              <section aria-label={creating ? 'Nouvelle requête' : 'Requête choisie'} className={cn('flex flex-col gap-3', !panelOpen && 'hidden lg:flex')}>
                <button type="button" onClick={back} className="inline-flex min-h-touch items-center gap-1 self-start text-sm font-black text-ink lg:hidden">
                  <BackIcon className="size-5" />
                  Mes requêtes
                </button>
                {creating ? (
                  <NewRequestForm
                    key={initialSubject}
                    initialSubject={initialSubject}
                    onCancel={back}
                    onSent={(request) => {
                      setSentId(request.id)
                      update({ requete: request.id, vue: null, objet: null }, { replace: true })
                    }}
                  />
                ) : (
                  current && (
                    <RequestDetail
                      key={current.id}
                      request={current}
                      justSent={sentId === current.id}
                      onFollowUp={() => openForm(followUpSubject(current))}
                    />
                  )
                )}
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
