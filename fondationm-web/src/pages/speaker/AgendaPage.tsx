import { useState } from 'react'
import { PageTitle } from '../../components/layout/PageTitle'
import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { greetingName } from '../../auth/currentUser'
import { useCurrentUser } from '../../auth/currentUserContext'
import { PATHS } from '../../auth/roles'
import { BackIcon } from '../../components/layout/icons'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Spinner } from '../../components/ui/Spinner'
import { buttonClass } from '../../components/ui/styles'
import { cn } from '../../lib/cn'
import { useNow } from '../../lib/useNow'
import { dayKey, formatDay, formatMonth, formatTimeRange, parseDayKey, startOfDay } from '../../lib/dateTime'
import { AgendaItemDetail } from './AgendaItemDetail'
import { STATE_CLASS, STATE_LABEL, buildAgenda, canPublishOn, groupByDay, itemLabel, type AgendaItem } from './agendaModel'
import { MonthGrid } from './MonthGrid'
import { SlotForm } from './SlotForm'
import { awaitsMyAnswer, useMeetings, useSlots } from './speakerData'

type Selection =
  | { kind: 'day'; day: string }
  | { kind: 'item'; key: string; day: string }
  /** day null : le jour se choisit dans le formulaire (téléphone). */
  | { kind: 'new'; day: string | null }

function readMonth(value: string | null, now: Date): Date {
  const match = value === null ? null : /^(\d{4})-(\d{2})$/.exec(value)
  if (match) {
    const month = Number(match[2]) - 1
    if (month >= 0 && month < 12) return new Date(Number(match[1]), month, 1)
  }
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function monthParam(month: Date): string {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
}

function pendingBanner(count: number): string {
  return count > 1
    ? `${count} demandes d'écoles attendent votre réponse`
    : "1 demande d'école attend votre réponse"
}

function ItemButton({ item, selected, onSelect }: { item: AgendaItem; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={itemLabel(item)}
      className={cn(
        'flex min-h-touch w-full items-center justify-between gap-3 rounded-block border-2 px-3 py-2 text-left font-extrabold',
        STATE_CLASS[item.state],
      )}
    >
      <span>{formatTimeRange(item.start, item.end)}</span>
      <span className="text-sm">
        {STATE_LABEL[item.state]}
        {item.main && ` · ${item.main.schoolName}`}
      </span>
    </button>
  )
}

export function AgendaPage() {
  const user = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const slots = useSlots()
  const meetings = useMeetings()
  const now = useNow()
  const todayKey = dayKey(now)
  const month = readMonth(params.get('mois'), now)
  const [selection, setSelection] = useState<Selection>({ kind: 'day', day: todayKey })
  const [panelOpen, setPanelOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const city = user.details?.kind === 'speaker' ? user.details.city : ''

  const items = buildAgenda(slots.data?.items ?? [], meetings.data?.items ?? [])
  const byDay = groupByDay(items)
  const toAnswer = (meetings.data?.items ?? []).filter(awaitsMyAnswer).length
  const upcoming = items.filter((item) => item.end.getTime() >= startOfDay(now).getTime())
  const upcomingDays = [...groupByDay(upcoming)]

  function select(next: Selection) {
    setNotice(null)
    setSelection(next)
    setPanelOpen(true)
  }

  function changeMonth(delta: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1)
    const search = new URLSearchParams(params)
    search.set('mois', monthParam(next))
    setParams(search)
  }

  const selectedItem = selection.kind === 'item' ? items.find((item) => item.key === selection.key) : undefined
  const panelDayKey = selection.day ?? null
  const panelDay = panelDayKey === null ? null : parseDayKey(panelDayKey)

  function renderPanel() {
    if (selection.kind === 'new') {
      return <SlotForm key={`new-${selection.day ?? 'libre'}`} day={panelDay} city={city} />
    }
    if (selectedItem !== undefined) {
      return (
        <AgendaItemDetail
          key={selectedItem.key}
          item={selectedItem}
          onRemoved={() => {
            setSelection({ kind: 'day', day: dayKey(selectedItem.start) })
            setNotice('Créneau retiré.')
          }}
        />
      )
    }
    if (panelDay === null) return null
    const dayItems = byDay.get(dayKey(panelDay)) ?? []
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl">{formatDay(panelDay)}</h2>
        {dayItems.length > 0 ? (
          <ul aria-label={`Éléments du ${formatDay(panelDay)}`} className="flex flex-col gap-2">
            {dayItems.map((item) => (
              <li key={item.key}>
                <ItemButton item={item} selected={false} onSelect={() => select({ kind: 'item', key: item.key, day: dayKey(item.start) })} />
              </li>
            ))}
          </ul>
        ) : (
          !canPublishOn(panelDay, now) && <p className="font-semibold text-muted">Rien de prévu ce jour-là.</p>
        )}
        {canPublishOn(panelDay, now) && <SlotForm key={`jour-${dayKey(panelDay)}`} day={panelDay} city={city} />}
      </div>
    )
  }

  const loading = slots.isPending || meetings.isPending
  const failed = slots.isError ? slots.error : meetings.isError ? meetings.error : null

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        className={cn(panelOpen && 'hidden md:flex')}
        kicker={`Bonjour ${greetingName(user)}`}
        title="Mon agenda"
        subtitle="Vos disponibilités, les demandes des écoles et vos rencontres, au même endroit."
      />

      {toAnswer > 0 && (
        <section
          aria-label="Demandes en attente"
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 rounded-block bg-cream px-4 py-3',
            panelOpen && 'hidden md:flex',
          )}
        >
          <p className="font-extrabold text-ink">{pendingBanner(toAnswer)}</p>
          <Link to={PATHS.speakerRequests} className={buttonClass('primary', { size: 'md' })}>
            Répondre
          </Link>
        </section>
      )}

      {(slots.data?.truncated === true || meetings.data?.truncated === true) && (
        <Alert tone="warning">Votre agenda est très chargé : tous les éléments n'ont pas pu être affichés.</Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-10 text-terra">
          <Spinner label="Chargement de votre agenda…" size="lg" />
        </div>
      ) : failed !== null ? (
        <ErrorState
          message={errorMessage(failed)}
          onRetry={() => {
            void slots.refetch()
            void meetings.refetch()
          }}
          retrying={slots.isFetching || meetings.isFetching}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <section aria-label="Calendrier" className={cn('flex flex-col gap-4', panelOpen && 'hidden md:flex')}>
            <div className="hidden items-center justify-between gap-2 md:flex">
              <Button variant="outline" size="md" onClick={() => changeMonth(-1)}>
                Mois précédent
              </Button>
              <h2 className="text-2xl" aria-live="polite">
                {formatMonth(month)}
              </h2>
              <Button variant="outline" size="md" onClick={() => changeMonth(1)}>
                Mois suivant
              </Button>
            </div>
            <div className="hidden md:block">
              <MonthGrid
                month={month}
                now={now}
                byDay={byDay}
                monthLabel={formatMonth(month)}
                selectedDay={selection.kind === 'day' ? selection.day : null}
                selectedItem={selection.kind === 'item' ? selection.key : null}
                onSelectDay={(day) => select({ kind: 'day', day: dayKey(day) })}
                onSelectItem={(item) => select({ kind: 'item', key: item.key, day: dayKey(item.start) })}
                onNewSlot={(day) => select({ kind: 'new', day: dayKey(day) })}
              />
            </div>

            <div className="flex flex-col gap-4 md:hidden">
              <Button size="md" onClick={() => select({ kind: 'new', day: null })}>
                Publier un créneau
              </Button>
              {upcomingDays.length === 0 ? (
                <EmptyState title="Rien de prévu pour l'instant." description="Publiez un créneau : les écoles pourront le demander." />
              ) : (
                <ol aria-label="Prochains jours" className="flex flex-col gap-4">
                  {upcomingDays.map(([key, dayItems]) => (
                    <li key={key} className="flex flex-col gap-2">
                      <h2 className="text-lg">{key === todayKey ? `Aujourd'hui · ${formatDay(dayItems[0]?.start ?? now)}` : formatDay(dayItems[0]?.start ?? now)}</h2>
                      <ul className="flex flex-col gap-2">
                        {dayItems.map((item) => (
                          <li key={item.key}>
                            <ItemButton
                              item={item}
                              selected={selection.kind === 'item' && selection.key === item.key}
                              onSelect={() => select({ kind: 'item', key: item.key, day: key })}
                            />
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <section
            aria-label="Détail"
            className={cn('flex flex-col gap-4 rounded-card bg-surface p-5 shadow-card', !panelOpen && 'hidden md:flex')}
          >
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="inline-flex min-h-touch items-center gap-2 self-start rounded-button px-2 font-extrabold text-indigo md:hidden"
            >
              <BackIcon className="size-5" />
              Retour
            </button>
            {notice && <Alert tone="success">{notice}</Alert>}
            {renderPanel()}
          </section>
        </div>
      )}
    </div>
  )
}
