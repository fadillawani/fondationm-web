import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../../../api/errors'
import { PageTitle } from '../../../components/layout/PageTitle'
import { BackIcon } from '../../../components/layout/icons'
import { Alert } from '../../../components/ui/Alert'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { Tabs } from '../../../components/ui/Tabs'
import { panelId, tabId } from '../../../components/ui/tabIds'
import { cn } from '../../../lib/cn'
import { useNow } from '../../../lib/useNow'
import { useFoundationMeetings, type FoundationMeeting } from './foundationMeetingsData'
import { REQUEST_TABS, byStart, inRequestTab, isAwaitingFoundation, type RequestTab } from './foundationMeetingState'
import { OutcomeBlock, RequestDetail } from './RequestDetail'
import { RequestList } from './RequestList'

const TAB_IDS = 'demandes'
const TAB_LABEL: Record<RequestTab, string> = {
  'a-traiter': 'À traiter',
  confirmees: 'Confirmées',
  refusees: 'Refusées ou annulées',
  toutes: 'Toutes',
}

interface DetailState {
  fromList?: boolean
}

/**
 * « Demandes de rencontre » (maquette W3-demandes) : la Fondation donne son avis en parallèle de l'intervenant.
 * URL : `?onglet=a-traiter|confirmees|refusees|toutes` et `?demande={id}`.
 */
export function RequestsPage() {
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const meetings = useFoundationMeetings()
  const [lastResult, setLastResult] = useState<FoundationMeeting | null>(null)

  const tab = REQUEST_TABS.find((value) => value === params.get('onglet')) ?? 'a-traiter'
  const selectedId = params.get('demande')
  // La rencontre renvoyée par l'action remplace l'ancienne en attendant le rechargement de la liste.
  const all = (meetings.data?.items ?? []).map((meeting) => (lastResult !== null && meeting.id === lastResult.id ? lastResult : meeting))
  const visible = all.filter((meeting) => inRequestTab(meeting, tab)).toSorted(byStart)
  const explicit = selectedId === null ? undefined : all.find((meeting) => meeting.id === selectedId)
  // Sur PC, sans sélection, la première demande de l'onglet est affichée ; sur téléphone, la liste.
  const current = explicit ?? visible[0]
  const detailOpen = explicit !== undefined
  const shownResult = lastResult !== null && lastResult.id !== current?.id ? lastResult : null

  function update(changes: Record<string, string | null>, { replace = false, state }: { replace?: boolean; state?: DetailState } = {}) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace, state })
  }

  function changeTab(value: RequestTab) {
    setLastResult(null)
    update({ onglet: value === 'a-traiter' ? null : value, demande: null })
  }

  function select(meeting: FoundationMeeting) {
    setLastResult(null)
    update({ demande: meeting.id }, { state: { fromList: true } })
  }

  function back() {
    const state = location.state as DetailState | null
    if (state?.fromList === true) void navigate(-1)
    else update({ demande: null }, { replace: true })
  }

  /** Après une décision : bloc de résultat, puis la demande à traiter suivante. */
  function processed(updated: FoundationMeeting) {
    setLastResult(updated)
    const next = all
      .filter((meeting) => meeting.id !== updated.id && isAwaitingFoundation(meeting) && inRequestTab(meeting, tab))
      .toSorted(byStart)[0]
    update({ demande: next?.id ?? updated.id }, { replace: true })
  }

  const items = TAB_LABEL
  const countOf = (value: RequestTab) => all.filter((meeting) => inRequestTab(meeting, value)).length

  return (
    <div className="flex flex-col gap-3 lg:gap-[18px]">
      <PageTitle
        className={cn(detailOpen && 'hidden lg:flex')}
        kicker="Avis en parallèle de l'intervenant"
        title="Demandes de rencontre"
        subtitle="Vous donnez votre avis en parallèle de l'intervenant. La rencontre est confirmée quand vous avez validé tous les deux."
      />

      {meetings.isPending ? (
        <div className="flex justify-center py-10 text-terra">
          <Spinner label="Chargement des demandes…" size="lg" />
        </div>
      ) : meetings.isError ? (
        <ErrorState message={errorMessage(meetings.error)} onRetry={() => void meetings.refetch()} retrying={meetings.isFetching} />
      ) : (
        <>
          <div className={cn(detailOpen && 'hidden lg:block')}>
            <Tabs
              size="sm"
              label="Filtrer les demandes"
              idPrefix={TAB_IDS}
              value={tab}
              onChange={changeTab}
              items={REQUEST_TABS.map((value) => ({ value, label: `${items[value]} · ${countOf(value)}` }))}
            />
          </div>
          {meetings.data.truncated && (
            <Alert tone="warning">Toutes les rencontres n'ont pas pu être chargées : la liste est incomplète.</Alert>
          )}

          <div
            role="tabpanel"
            id={panelId(TAB_IDS)}
            aria-labelledby={tabId(TAB_IDS, tab)}
            className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start"
          >
            <div className={cn('flex flex-col gap-2.5', detailOpen && 'hidden lg:flex')}>
              {visible.length === 0 ? (
                <p className="rounded-[18px] bg-surface p-4 font-bold text-muted lg:p-[18px]">Aucune demande ici.</p>
              ) : (
                <RequestList
                  label={`Demandes : ${TAB_LABEL[tab].toLocaleLowerCase('fr-FR')}`}
                  meetings={visible}
                  selectedId={current?.id ?? null}
                  now={now}
                  onSelect={select}
                />
              )}
            </div>

            <section
              aria-label="Détail de la demande"
              aria-live="polite"
              className={cn('flex flex-col gap-3', !detailOpen && 'hidden lg:flex')}
            >
              <div className="flex items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={back}
                  aria-label="Retour à la liste"
                  className="inline-flex size-11 items-center justify-center rounded-[14px] text-ink"
                >
                  <BackIcon className="size-6" />
                </button>
                <span className="text-sm font-black">Demande de rencontre</span>
              </div>
              {shownResult !== null && <OutcomeBlock meeting={shownResult} heading />}
              {current !== undefined && <RequestDetail
                  key={current.id}
                  meeting={current}
                  all={all}
                  onProcessed={processed}
                  onPin={() => {
                    if (selectedId !== current.id) update({ demande: current.id }, { replace: true })
                  }}
                />}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
