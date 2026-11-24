import { useState } from 'react'
import { PageTitle } from '../../components/layout/PageTitle'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import type { AccountStatus } from '../../auth/currentUser'
import { BackIcon } from '../../components/layout/icons'
import { Alert } from '../../components/ui/Alert'
import { ChoiceGroup } from '../../components/ui/ChoiceGroup'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Pagination } from '../../components/ui/Pagination'
import { Spinner } from '../../components/ui/Spinner'
import { Tabs } from '../../components/ui/Tabs'
import { panelId, tabId } from '../../components/ui/tabIds'
import { cn } from '../../lib/cn'
import { AccountDetail } from './AccountDetail'
import { AccountList } from './AccountList'
import { useAccounts, usePendingCounts, type Account, type AccountFilter, type RequestRole } from './accounts'
import { ResultBlock } from './ResultBlock'

type Tab = 'ecoles' | 'intervenants' | 'traites'
type KindFilter = 'ecoles' | 'intervenants'
type DecisionFilter = 'valides' | 'refuses'

const TAB_IDS = 'comptes'
const KIND_ROLE: Record<KindFilter, RequestRole> = { ecoles: 'SCHOOL', intervenants: 'SPEAKER' }
const DECISION_STATUS: Record<DecisionFilter, AccountStatus> = { valides: 'VALIDATED', refuses: 'REJECTED' }

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.find((item) => item === value) ?? fallback
}

interface DetailState {
  fromList?: boolean
}

function readUrl(params: URLSearchParams) {
  const tab = pick<Tab>(params.get('onglet'), ['ecoles', 'intervenants', 'traites'], 'ecoles')
  const kind = pick<KindFilter>(params.get('type'), ['ecoles', 'intervenants'], 'ecoles')
  const decision = pick<DecisionFilter>(params.get('decision'), ['valides', 'refuses'], 'valides')
  const rawPage = Number(params.get('page'))
  const page = Number.isInteger(rawPage) && rawPage > 1 ? rawPage - 1 : 0
  const filter: AccountFilter =
    tab === 'traites'
      ? { role: KIND_ROLE[kind], status: DECISION_STATUS[decision], page }
      : { role: tab === 'ecoles' ? 'SCHOOL' : 'SPEAKER', status: 'PENDING', page }
  return { tab, kind, decision, filter, selectedId: params.get('compte') }
}

function withCount(label: string, count: number | undefined): string {
  return count === undefined ? label : `${label} · ${count}`
}

export function AccountsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { tab, kind, decision, filter, selectedId } = readUrl(params)
  const accounts = useAccounts(filter)
  const counts = usePendingCounts()
  const [lastResult, setLastResult] = useState<Account | null>(null)
  const [conflict, setConflict] = useState(false)

  const items = accounts.data?.items ?? []
  const explicit = selectedId === null ? undefined : items.find((account) => account.id === selectedId)
  const shownResult = lastResult !== null && lastResult.id === selectedId ? lastResult : null
  // Sur PC, sans sélection valide, le premier compte de la liste est affiché.
  const current = explicit ?? (shownResult === null ? items[0] : undefined)
  const detail = current !== undefined && current.id !== shownResult?.id ? current : undefined
  // Sur téléphone, le détail s'ouvre seulement pour un compte présent dans la page chargée.
  const detailOpen = explicit !== undefined || shownResult !== null

  function update(changes: Record<string, string | null>, { replace = false, state }: { replace?: boolean; state?: DetailState } = {}) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace, state })
  }

  function resetMessages() {
    setLastResult(null)
    setConflict(false)
  }

  function changeTab(value: Tab) {
    resetMessages()
    update({ onglet: value, page: null, compte: null })
  }

  function changeFilter(key: 'type' | 'decision', value: string) {
    resetMessages()
    update({ [key]: value, page: null, compte: null })
  }

  function changePage(page: number) {
    resetMessages()
    update({ page: page > 0 ? String(page + 1) : null, compte: null })
  }

  function select(account: Account) {
    resetMessages()
    update({ compte: account.id }, { state: { fromList: true } })
  }

  function back() {
    const state = location.state as DetailState | null
    if (state?.fromList === true) void navigate(-1)
    else update({ compte: null }, { replace: true })
  }

  function processed(result: Account) {
    const index = items.findIndex((account) => account.id === result.id)
    const remaining = items.filter((account) => account.id !== result.id)
    const next = remaining[Math.min(Math.max(index, 0), remaining.length - 1)]
    setConflict(false)
    setLastResult(result)
    update({ compte: next?.id ?? result.id }, { replace: true })
  }

  function alreadyProcessed() {
    setLastResult(null)
    setConflict(true)
    update({ compte: null }, { replace: true })
  }

  // Page devenue hors limites (dernier compte d'une page traité) : retour à la dernière page.
  const totalPages = accounts.data?.totalPages ?? 0
  if (totalPages > 0 && filter.page >= totalPages) {
    const next = new URLSearchParams(params)
    if (totalPages > 1) next.set('page', String(totalPages))
    else next.delete('page')
    return <Navigate to={{ search: next.toString() }} replace />
  }

  const listLabel =
    tab === 'traites'
      ? `Comptes déjà traités : ${kind === 'ecoles' ? 'écoles' : 'intervenants'} ${decision === 'valides' ? 'validés' : 'refusés'}`
      : tab === 'ecoles'
        ? 'Écoles en attente'
        : 'Intervenants en attente'

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        className={cn(detailOpen && 'hidden lg:flex')}
        kicker="Comptes"
        title="Comptes à valider"
        subtitle="Des écoles et des bénévoles veulent rejoindre le programme."
      />

      <div className={cn(detailOpen && 'hidden lg:block')}>
        <Tabs
          label="Catégories de comptes"
          idPrefix={TAB_IDS}
          value={tab}
          onChange={changeTab}
          items={[
            { value: 'ecoles', label: withCount('Écoles', counts.SCHOOL) },
            { value: 'intervenants', label: withCount('Intervenants', counts.SPEAKER) },
            { value: 'traites', label: 'Déjà traités' },
          ]}
        />
      </div>

      {conflict && (
        <Alert tone="warning" title="Ce compte a déjà été traité">
          La liste a été rechargée.
        </Alert>
      )}

      <div role="tabpanel" id={panelId(TAB_IDS)} aria-labelledby={tabId(TAB_IDS, tab)} className="flex flex-col gap-4">
        {tab === 'intervenants' && (
          <p className={cn('rounded-block bg-cream-soft px-4 py-3 text-sm font-semibold text-ink', detailOpen && 'hidden lg:block')}>
            Pour les intervenants, la validation n'est pas une sélection : vérifiez simplement l'identité et la
            cohérence du profil, sans critère de qualité.
          </p>
        )}

        {tab === 'traites' && (
          <div className={cn('flex flex-wrap gap-x-6 gap-y-3', detailOpen && 'hidden lg:flex')}>
            <ChoiceGroup
              label="Type de compte"
              value={kind}
              onChange={(value) => changeFilter('type', value)}
              options={[
                { value: 'ecoles', label: 'Écoles' },
                { value: 'intervenants', label: 'Intervenants' },
              ]}
            />
            <ChoiceGroup
              label="Décision"
              value={decision}
              onChange={(value) => changeFilter('decision', value)}
              options={[
                { value: 'valides', label: 'Validés' },
                { value: 'refuses', label: 'Refusés' },
              ]}
            />
          </div>
        )}

        {accounts.isPending ? (
          <div className="flex justify-center py-10 text-terra">
            <Spinner label="Chargement des comptes…" size="lg" />
          </div>
        ) : accounts.isError ? (
          <ErrorState
            message={errorMessage(accounts.error)}
            onRetry={() => void accounts.refetch()}
            retrying={accounts.isFetching}
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
            <div className={cn('flex flex-col gap-4', detailOpen && 'hidden lg:flex')}>
              {items.length === 0 ? (
                <EmptyState
                  title={tab === 'traites' ? 'Aucun compte dans cette catégorie.' : 'Tout est à jour. Bravo !'}
                />
              ) : (
                <AccountList
                  label={listLabel}
                  accounts={items}
                  selectedId={current?.id ?? null}
                  onSelect={select}
                />
              )}
              <Pagination
                page={filter.page}
                totalPages={accounts.data.totalPages}
                onChange={changePage}
                label="Pages de comptes"
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
              {lastResult !== null && <ResultBlock account={lastResult} live />}
              {detail !== undefined && (
                <AccountDetail
                  key={detail.id}
                  account={detail}
                  onProcessed={processed}
                  onConflict={alreadyProcessed}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
