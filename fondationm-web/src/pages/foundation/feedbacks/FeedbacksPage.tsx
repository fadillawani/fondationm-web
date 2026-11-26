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
import { FEEDBACK_TABS, inTab, pairByMeeting, pairTitle, submittedCount, type FeedbackTab } from './foundationFeedbackModel'
import { useFoundationFeedbacks } from './foundationFeedbacksData'
import { PairDetail, PairList, type FeedbackPart } from './FeedbackPairViews'

const TAB_IDS = 'retours'
const PART_IDS = 'partie'
const PARTS: readonly FeedbackPart[] = ['ecole', 'intervenant']

interface DetailState {
  fromList?: boolean
}

/**
 * « Retours d'expérience » de la Fondation (maquette W3-retours). URL : `?onglet=a-valider|valides|tous`,
 * `?rencontre={meetingId}`, `?partie=ecole|intervenant` (mobile). La rencontre choisie est lue parmi toutes les
 * rencontres, pas seulement celles de l'onglet : elle reste affichée après sa publication (décision 95).
 */
export function FeedbacksPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const feedbacks = useFoundationFeedbacks()
  const tab = FEEDBACK_TABS.find((value) => value === params.get('onglet')) ?? 'a-valider'
  const part = PARTS.find((value) => value === params.get('partie')) ?? 'ecole'
  const selectedId = params.get('rencontre')
  const items = feedbacks.data?.items ?? []
  const pairs = pairByMeeting(items)
  const visible = pairs.filter((pair) => inTab(pair, tab))
  const explicit = selectedId === null ? undefined : pairs.find((pair) => pair.meetingId === selectedId)
  const current = explicit ?? visible[0]
  const detailOpen = explicit !== undefined
  const toValidate = submittedCount(items)

  function update(changes: Record<string, string | null>, { replace = false, state }: { replace?: boolean; state?: DetailState } = {}) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace, state })
  }

  function back() {
    const state = location.state as DetailState | null
    if (state?.fromList === true) void navigate(-1)
    else update({ rencontre: null, partie: null }, { replace: true })
  }

  const labels: Record<FeedbackTab, string> = {
    'a-valider': feedbacks.data === undefined ? 'À valider' : `À valider · ${toValidate}`,
    valides: 'Validés',
    tous: 'Tous',
  }

  return (
    <div className="flex flex-col gap-3 lg:gap-[18px]">
      <PageTitle
        className={cn(detailOpen && 'hidden lg:flex')}
        kicker="Rencontres racontées"
        title="Retours d'expérience"
        subtitle="Lisez ce que l'école et l'intervenant ont vécu. Ce sont des avis : vous ne pouvez pas les refuser. Les valider les rend visibles dans le rapport d'impact des donateurs."
        mobileSubtitle="Ce sont des avis : on les valide pour les partager aux donateurs, sans les refuser."
      />

      <div className={cn(detailOpen && 'hidden lg:block')}>
        <Tabs
          label="Retours par état"
          idPrefix={TAB_IDS}
          value={tab}
          onChange={(value) => update({ onglet: value === 'a-valider' ? null : value, rencontre: null, partie: null })}
          items={FEEDBACK_TABS.map((value) => ({ value, label: labels[value] }))}
        />
      </div>

      <div role="tabpanel" id={panelId(TAB_IDS)} aria-labelledby={tabId(TAB_IDS, tab)}>
        {feedbacks.isPending ? (
          <div className="flex justify-center py-10 text-terra">
            <Spinner label="Chargement des retours…" size="lg" />
          </div>
        ) : feedbacks.isError ? (
          <ErrorState message={errorMessage(feedbacks.error)} onRetry={() => void feedbacks.refetch()} retrying={feedbacks.isFetching} />
        ) : (
          <div className="flex flex-col gap-3">
            {feedbacks.data.truncated && <Alert tone="warning">Tous les retours n'ont pas pu être chargés.</Alert>}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
              <div className={cn('flex flex-col gap-2.5', detailOpen && 'hidden lg:flex')}>
                {visible.length === 0 ? (
                  <p className="rounded-[18px] bg-surface p-4 font-bold text-muted">
                    {tab === 'a-valider' ? 'Tous les retours sont validés. Merci !' : 'Aucun retour pour l’instant.'}
                  </p>
                ) : (
                  <PairList
                    pairs={visible}
                    selectedId={current?.meetingId ?? null}
                    onSelect={(pair) => update({ rencontre: pair.meetingId, partie: null }, { state: { fromList: true } })}
                  />
                )}
              </div>
              {current && (
                <section aria-label="Retours de la rencontre" className={cn('flex flex-col gap-3', !detailOpen && 'hidden lg:flex')}>
                  <div className="flex items-center gap-2 lg:hidden">
                    <button
                      type="button"
                      onClick={back}
                      aria-label="Retour à la liste"
                      className="inline-flex size-11 items-center justify-center rounded-[14px] text-ink"
                    >
                      <BackIcon className="size-6" />
                    </button>
                    <span className="truncate text-sm font-black">{pairTitle(current)}</span>
                  </div>
                  <div className="lg:hidden">
                    <Tabs
                      size="sm"
                      label="Retour affiché"
                      idPrefix={PART_IDS}
                      value={part}
                      onChange={(value) => update({ partie: value === 'ecole' ? null : value, rencontre: current.meetingId }, { replace: true })}
                      items={[
                        { value: 'ecole', label: 'Retour de l’école' },
                        { value: 'intervenant', label: 'Retour de l’intervenant' },
                      ]}
                    />
                  </div>
                  <div id={panelId(PART_IDS)}>
                    <PairDetail
                      key={current.meetingId}
                      pair={current}
                      part={part}
                      onPin={() => {
                        if (selectedId !== current.meetingId) update({ rencontre: current.meetingId }, { replace: true })
                      }}
                    />
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
