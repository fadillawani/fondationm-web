import { useState } from 'react'
import { PageTitle } from '../../components/layout/PageTitle'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useCurrentUser } from '../../auth/currentUserContext'
import { BackIcon, LockIcon } from '../../components/layout/icons'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Pagination } from '../../components/ui/Pagination'
import { Spinner } from '../../components/ui/Spinner'
import { Tabs } from '../../components/ui/Tabs'
import { panelId, tabId } from '../../components/ui/tabIds'
import { cn } from '../../lib/cn'
import { RequestDetail } from './RequestDetail'
import { RequestResult } from './RequestResult'
import { awaitsMyAnswer, useMeetings, type Meeting } from './speakerData'
import { classLine, isInMyZone, pendingOnSameSlot, requestBadge, shortSlotText } from './speakerText'

type Tab = 'a-traiter' | 'acceptees' | 'refusees' | 'toutes'

const TABS: readonly Tab[] = ['a-traiter', 'acceptees', 'refusees', 'toutes']
const TAB_IDS = 'demandes'
const PAGE_SIZE = 20

const IN_TAB: Record<Tab, (meeting: Meeting) => boolean> = {
  'a-traiter': awaitsMyAnswer,
  acceptees: (meeting) =>
    (meeting.status === 'PENDING' && meeting.myDecision === 'VALIDATED') ||
    meeting.status === 'CONFIRMED' ||
    meeting.status === 'COMPLETED',
  refusees: (meeting) => meeting.status === 'REFUSED' || meeting.status === 'CANCELLED',
  toutes: () => true,
}

const EMPTY: Record<Tab, string> = {
  'a-traiter': 'Aucune demande à traiter pour l’instant.',
  acceptees: 'Aucune demande acceptée.',
  refusees: 'Aucune demande refusée ou annulée.',
  toutes: 'Aucune demande reçue pour l’instant.',
}

const CONFLICT_MESSAGE: Partial<Record<string, string>> = {
  SLOT_PASSED: 'Ce créneau est déjà passé.',
}

interface DetailState {
  fromList?: boolean
}

function bySlot(a: Meeting, b: Meeting): number {
  return (a.slot?.startAt ?? '').localeCompare(b.slot?.startAt ?? '')
}

export function RequestsPage() {
  const user = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const meetings = useMeetings()
  const [lastResult, setLastResult] = useState<Meeting | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)

  const tab = TABS.find((value) => value === params.get('onglet')) ?? 'a-traiter'
  const rawPage = Number(params.get('page'))
  const page = Number.isInteger(rawPage) && rawPage > 1 ? rawPage - 1 : 0
  const selectedId = params.get('demande')
  const me = user.details?.kind === 'speaker' ? { city: user.details.city, country: user.details.country } : null

  const all = meetings.data?.items ?? []
  const inTab = all.filter(IN_TAB[tab]).toSorted(bySlot)
  const totalPages = Math.ceil(inTab.length / PAGE_SIZE)
  const items = inTab.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const toAnswer = all.filter(awaitsMyAnswer).length

  const explicit = selectedId === null ? undefined : items.find((meeting) => meeting.id === selectedId)
  const shownResult = lastResult !== null && lastResult.id === selectedId ? lastResult : null
  // Sur PC, sans sélection valide, la première demande de la liste est affichée.
  const current = explicit ?? (shownResult === null ? items[0] : undefined)
  const detail = current !== undefined && current.id !== shownResult?.id ? current : undefined
  // Sur téléphone, le détail s'ouvre seulement pour une demande présente dans la page affichée.
  const detailOpen = explicit !== undefined || shownResult !== null

  function update(changes: Record<string, string | null>, options: { replace?: boolean; state?: DetailState } = {}) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, options)
  }

  function reset() {
    setLastResult(null)
    setConflict(null)
  }

  function back() {
    const state = location.state as DetailState | null
    if (state?.fromList === true) void navigate(-1)
    else update({ demande: null }, { replace: true })
  }

  function processed(result: Meeting) {
    const index = items.findIndex((meeting) => meeting.id === result.id)
    // La demande traitée quitte l'onglet (« À traiter ») : bloc de résultat puis demande suivante.
    const remaining = items.filter((meeting) => meeting.id !== result.id)
    const next = remaining[Math.min(Math.max(index, 0), remaining.length - 1)]
    const stays = IN_TAB[tab](result)
    setConflict(null)
    setLastResult(result)
    update({ demande: stays ? result.id : (next?.id ?? result.id) }, { replace: true })
  }

  function alreadyProcessed(code: string) {
    setLastResult(null)
    setConflict(CONFLICT_MESSAGE[code] ?? 'Cette demande a déjà été traitée.')
    update({ demande: null }, { replace: true })
  }

  if (meetings.data !== undefined && totalPages > 0 && page >= totalPages) {
    const next = new URLSearchParams(params)
    if (totalPages > 1) next.set('page', String(totalPages))
    else next.delete('page')
    return <Navigate to={{ search: next.toString() }} replace />
  }

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        className={cn(detailOpen && 'hidden lg:flex')}
        kicker="Des classes vous attendent"
        title="Demandes reçues"
        subtitle="Répondez selon votre disponibilité. La Fondation M donne aussi son avis, de son côté."
      />

      <div className={cn(detailOpen && 'hidden lg:block')}>
        <Tabs
          label="Catégories de demandes"
          idPrefix={TAB_IDS}
          value={tab}
          onChange={(value) => {
            reset()
            update({ onglet: value, page: null, demande: null })
          }}
          items={[
            { value: 'a-traiter', label: meetings.data ? `À traiter · ${toAnswer}` : 'À traiter' },
            { value: 'acceptees', label: 'Acceptées' },
            { value: 'refusees', label: 'Refusées ou annulées' },
            { value: 'toutes', label: 'Toutes' },
          ]}
        />
      </div>

      {conflict && (
        <Alert tone="warning" title={conflict}>
          La liste a été rechargée.
        </Alert>
      )}
      {meetings.data?.truncated && (
        <Alert tone="warning">
          Vous avez beaucoup de demandes : toutes n’ont pas pu être chargées. Les plus récentes peuvent manquer.
        </Alert>
      )}

      <div role="tabpanel" id={panelId(TAB_IDS)} aria-labelledby={tabId(TAB_IDS, tab)}>
        {meetings.isPending ? (
          <div className="flex justify-center py-10 text-terra">
            <Spinner label="Chargement des demandes…" size="lg" />
          </div>
        ) : meetings.isError ? (
          <ErrorState
            message={errorMessage(meetings.error)}
            onRetry={() => void meetings.refetch()}
            retrying={meetings.isFetching}
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
            <div className={cn('flex flex-col gap-4', detailOpen && 'hidden lg:flex')}>
              {items.length === 0 ? (
                <EmptyState title={EMPTY[tab]} />
              ) : (
                <ul aria-label="Demandes" className="flex flex-col gap-2">
                  {items.map((meeting) => {
                    const selected = meeting.id === current?.id
                    const badge = requestBadge(meeting)
                    const sameSlot = meeting.status === 'PENDING' ? pendingOnSameSlot(meeting, all) : 0
                    const line = classLine(meeting)
                    return (
                      <li key={meeting.id}>
                        <button
                          type="button"
                          aria-current={selected || undefined}
                          onClick={() => {
                            reset()
                            update({ demande: meeting.id }, { state: { fromList: true } })
                          }}
                          className={cn(
                            'flex min-h-touch w-full flex-col gap-1 rounded-block border-2 bg-surface p-3 text-left transition-colors',
                            selected ? 'border-ink' : 'border-line hover:border-muted',
                          )}
                        >
                          <span className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-extrabold text-terra">{shortSlotText(meeting)}</span>
                            <Badge tone={badge.tone}>{badge.label}</Badge>
                          </span>
                          <span className="font-extrabold text-ink">{meeting.schoolName}</span>
                          {line && <span className="text-sm font-semibold text-muted">{line}</span>}
                          {sameSlot > 1 && (
                            <span className="text-sm font-extrabold text-terra-dark">{sameSlot} demandes sur ce créneau</span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <Pagination
                page={page}
                totalPages={totalPages}
                label="Pages de demandes"
                onChange={(value) => {
                  reset()
                  update({ page: value > 0 ? String(value + 1) : null, demande: null })
                }}
              />
            </div>

            <div className={cn('flex flex-col gap-4', !detailOpen && 'hidden lg:flex')}>
              <button
                type="button"
                onClick={back}
                className="inline-flex min-h-touch items-center gap-2 self-start rounded-button px-2 font-extrabold text-indigo lg:hidden"
              >
                <BackIcon className="size-5" />
                Retour
              </button>
              {lastResult !== null && <RequestResult meeting={lastResult} live />}
              {detail !== undefined && (
                <RequestDetail
                  key={detail.id}
                  meeting={detail}
                  all={all}
                  inMyZone={isInMyZone(detail, me)}
                  onProcessed={processed}
                  onConflict={alreadyProcessed}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <p className="flex items-start gap-2 text-sm font-semibold text-muted">
        <LockIcon className="mt-0.5 size-4 shrink-0" />
        Les noms des élèves et les coordonnées du référent ne sont jamais affichés. La Fondation M fait le lien avec
        l'école.
      </p>
    </div>
  )
}
