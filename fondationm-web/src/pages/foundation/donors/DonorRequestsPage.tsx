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
import { DonorRequestDetail, DonorRequestList } from './DonorRequestViews'
import { useDonorRequests, useDonors, type DonorRequest } from './donorsData'
import { byNewestOpenFirst } from './donorsText'
import { DonorsTab } from './DonorsTab'

type Tab = 'requetes' | 'donateurs'
const TABS: readonly Tab[] = ['requetes', 'donateurs']
const TAB_IDS = 'donateurs'

interface DetailState {
  fromList?: boolean
}

/**
 * « Requêtes donateurs » (maquette W3-requetes) et onglet « Donateurs » (sans maquette). URL :
 * `?onglet=requetes|donateurs`, `?requete={id}`.
 */
export function DonorRequestsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const requests = useDonorRequests()
  const donors = useDonors()
  const tab = TABS.find((value) => value === params.get('onglet')) ?? 'requetes'
  const selectedId = params.get('requete')
  const list = (requests.data?.items ?? []).toSorted(byNewestOpenFirst)
  const explicit = selectedId === null ? undefined : list.find((request) => request.id === selectedId)
  const current = explicit ?? list[0]
  const detailOpen = tab === 'requetes' && explicit !== undefined

  function update(changes: Record<string, string | null>, { replace = false, state }: { replace?: boolean; state?: DetailState } = {}) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace, state })
  }

  function select(request: DonorRequest) {
    update({ requete: request.id }, { state: { fromList: true } })
  }

  function back() {
    const state = location.state as DetailState | null
    if (state?.fromList === true) void navigate(-1)
    else update({ requete: null }, { replace: true })
  }

  const counts: Record<Tab, number | undefined> = { requetes: requests.data?.items.length, donateurs: donors.data?.items.length }

  return (
    <div className="flex flex-col gap-3 lg:gap-[18px]">
      <PageTitle
        className={cn(detailOpen && 'hidden lg:flex')}
        kicker="Donateurs"
        title="Requêtes donateurs"
        subtitle="Les personnes qui financent les rencontres vous écrivent. Votre réponse est visible dans leur espace."
      />

      <div className={cn(detailOpen && 'hidden lg:block')}>
        <Tabs
          size="md"
          label="Requêtes et donateurs"
          idPrefix={TAB_IDS}
          value={tab}
          onChange={(value) => update({ onglet: value === 'requetes' ? null : value, requete: null })}
          items={[
            { value: 'requetes', label: counts.requetes === undefined ? 'Requêtes' : `Requêtes · ${counts.requetes}` },
            { value: 'donateurs', label: counts.donateurs === undefined ? 'Donateurs' : `Donateurs · ${counts.donateurs}` },
          ]}
        />
      </div>

      <div role="tabpanel" id={panelId(TAB_IDS)} aria-labelledby={tabId(TAB_IDS, tab)}>
        {tab === 'requetes' &&
          (requests.isPending ? (
            <div className="flex justify-center py-10 text-terra">
              <Spinner label="Chargement des requêtes…" size="lg" />
            </div>
          ) : requests.isError ? (
            <ErrorState message={errorMessage(requests.error)} onRetry={() => void requests.refetch()} retrying={requests.isFetching} />
          ) : (
            <div className="flex flex-col gap-3">
              {requests.data.truncated && <Alert tone="warning">Toutes les requêtes n'ont pas pu être chargées.</Alert>}
              <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
                <div className={cn('flex flex-col gap-2.5', detailOpen && 'hidden lg:flex')}>
                  {list.length === 0 ? (
                    <p className="rounded-[18px] bg-surface p-4 font-bold text-muted">Aucune requête de donateur pour l'instant.</p>
                  ) : (
                    <DonorRequestList requests={list} selectedId={current?.id ?? null} onSelect={select} />
                  )}
                </div>
                <section aria-label="Conversation" aria-live="polite" className={cn('flex flex-col gap-3', !detailOpen && 'hidden lg:flex')}>
                  <div className="flex items-center gap-2 lg:hidden">
                    <button
                      type="button"
                      onClick={back}
                      aria-label="Retour à la liste"
                      className="inline-flex size-11 items-center justify-center rounded-[14px] text-ink"
                    >
                      <BackIcon className="size-6" />
                    </button>
                    {current && (
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-black">{current.subject}</span>
                        <span className="text-xs font-bold text-muted">{current.donorName}</span>
                      </span>
                    )}
                  </div>
                  {current && (
                    <DonorRequestDetail
                      key={current.id}
                      request={current}
                      onPin={() => {
                        if (selectedId !== current.id) update({ requete: current.id }, { replace: true })
                      }}
                    />
                  )}
                </section>
              </div>
            </div>
          ))}
        {/* L'onglet reste monté : les codes des fiches vivent dans son état et ne doivent pas se perdre. */}
        <div hidden={tab !== 'donateurs'}>
          <DonorsTab
            donors={donors.data}
            isPending={donors.isPending}
            error={donors.isError ? donors.error : null}
            onRetry={() => void donors.refetch()}
            retrying={donors.isFetching}
          />
        </div>
      </div>
    </div>
  )
}
