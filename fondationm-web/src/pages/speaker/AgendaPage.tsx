import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { greetingName } from '../../auth/currentUser'
import { useCurrentUser } from '../../auth/currentUserContext'
import { PATHS } from '../../auth/roles'
import { MonthNav } from '../../components/calendar/MonthNav'
import { PageTitle } from '../../components/layout/PageTitle'
import { Alert } from '../../components/ui/Alert'
import { ErrorState } from '../../components/ui/ErrorState'
import { Spinner } from '../../components/ui/Spinner'
import { monthParam, readMonthParam } from '../../lib/calendar'
import { cn } from '../../lib/cn'
import { dayKey, formatMonth, formatShortDay, formatTimeRange, parseDayKey } from '../../lib/dateTime'
import { useNow } from '../../lib/useNow'
import { AgendaCompact } from './AgendaCompact'
import { AgendaItemDetail } from './AgendaItemDetail'
import {
  STATE_ACCENT,
  STATE_CLASS,
  STATE_LABEL,
  buildAgenda,
  canPublishOn,
  groupByDay,
  itemLabel,
  type AgendaItem,
} from './agendaModel'
import { MonthGrid } from './MonthGrid'
import { SlotForm } from './SlotForm'
import { awaitsMyAnswer, useMeetings, useSlots } from './speakerData'

type Selection =
  | { kind: 'day'; day: string }
  | { kind: 'item'; key: string; day: string }
  | { kind: 'new'; day: string }

function ItemButton({ item, onSelect }: { item: AgendaItem; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={itemLabel(item)}
      className={cn(
        'flex min-h-touch w-full items-center justify-between gap-3 rounded-[12px] px-3 py-2 text-left font-extrabold',
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

/** Pastille d'en-tête du panneau (maquette) : « Jour libre » en pointillé vert, sinon l'état. */
function PanelPill({ item }: { item: AgendaItem | undefined }) {
  if (item === undefined) {
    return (
      <span className="rounded-pill border-2 border-dashed border-green bg-surface px-2.5 py-0.5 text-[11px] font-black text-[#3B5221] lg:text-xs">
        Jour libre
      </span>
    )
  }
  return (
    <span className={cn('rounded-pill px-2.5 py-0.5 text-[11px] font-black lg:text-xs', STATE_CLASS[item.state])}>
      {STATE_LABEL[item.state]}
    </span>
  )
}

export function AgendaPage() {
  const user = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const slots = useSlots()
  const meetings = useMeetings()
  const now = useNow()
  const todayKey = dayKey(now)
  const month = readMonthParam(params.get('mois'), now)
  const [selection, setSelection] = useState<Selection>({ kind: 'day', day: todayKey })
  const [notice, setNotice] = useState<string | null>(null)
  const city = user.details?.kind === 'speaker' ? user.details.city : ''

  const items = buildAgenda(slots.data?.items ?? [], meetings.data?.items ?? [])
  const byDay = groupByDay(items)
  const toAnswer = (meetings.data?.items ?? []).filter(awaitsMyAnswer).length

  function select(next: Selection) {
    setNotice(null)
    setSelection(next)
  }

  function changeMonth(delta: number) {
    const search = new URLSearchParams(params)
    search.set('mois', monthParam(new Date(month.getFullYear(), month.getMonth() + delta, 1)))
    setParams(search)
  }

  const selectedItem = selection.kind === 'item' ? items.find((item) => item.key === selection.key) : undefined
  const panelDay = parseDayKey(selection.day)

  function renderPanel() {
    if (panelDay === null) return null
    if (selection.kind === 'new') return <SlotForm key={`new-${selection.day}`} day={panelDay} city={city} />
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
    const dayItems = byDay.get(dayKey(panelDay)) ?? []
    return (
      <div className="flex flex-col gap-4">
        {dayItems.length > 0 && (
          <ul aria-label={`Éléments du ${formatShortDay(panelDay)}`} className="flex flex-col gap-2">
            {dayItems.map((item) => (
              <li key={item.key}>
                <ItemButton item={item} onSelect={() => select({ kind: 'item', key: item.key, day: dayKey(item.start) })} />
              </li>
            ))}
          </ul>
        )}
        {canPublishOn(panelDay, now) ? (
          <SlotForm key={`jour-${dayKey(panelDay)}`} day={panelDay} city={city} />
        ) : (
          dayItems.length === 0 && <p className="text-sm font-semibold text-muted">Rien de prévu ce jour-là.</p>
        )}
      </div>
    )
  }

  const loading = slots.isPending || meetings.isPending
  const failed = slots.isError ? slots.error : meetings.isError ? meetings.error : null
  const accent = selectedItem ? STATE_ACCENT[selectedItem.state] : 'border-green'

  return (
    <div className="flex flex-col gap-[18px]">
      <PageTitle
        kicker={`Bonjour ${greetingName(user)}`}
        title="Mon agenda"
        subtitle="Vos disponibilités, les demandes des écoles et vos rencontres, au même endroit."
      />

      {toAnswer > 0 && (
        <section aria-label="Demandes en attente">
          <Link
            to={PATHS.speakerRequests}
            className="flex items-center gap-3 rounded-2xl bg-ink p-3 text-white lg:inline-flex lg:gap-3.5 lg:rounded-[18px] lg:px-[18px] lg:py-3.5"
          >
            <span className="font-display text-[26px] leading-none text-cream lg:text-[30px]">{toAnswer}</span>
            <span className="flex-1 text-[13px] font-extrabold lg:text-[15px] lg:font-bold">
              <span className="hidden lg:inline">
                {toAnswer > 1 ? "demandes d'écoles attendent votre réponse" : "demande d'école attend votre réponse"}
              </span>
              <span className="lg:hidden">{toAnswer > 1 ? 'demandes à traiter' : 'demande à traiter'}</span>
            </span>
            <span className="text-sm font-black text-cream">Répondre</span>
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
        <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5">
          <div className="min-w-0">
            <section aria-label="Calendrier" className="hidden flex-col gap-3.5 rounded-[24px] bg-surface p-5 md:flex">
              <MonthNav month={month} onMonth={changeMonth} compact={false} />
              <MonthGrid
                month={month}
                now={now}
                byDay={byDay}
                monthLabel={formatMonth(month)}
                selectedDay={selection.kind === 'item' ? null : selection.day}
                selectedItem={selection.kind === 'item' ? selection.key : null}
                onSelectDay={(day) => select({ kind: 'day', day: dayKey(day) })}
                onSelectItem={(item) => select({ kind: 'item', key: item.key, day: dayKey(item.start) })}
                onNewSlot={(day) => select({ kind: 'new', day: dayKey(day) })}
              />
            </section>
            <div className="md:hidden">
              <AgendaCompact
                month={month}
                now={now}
                byDay={byDay}
                selectedKey={selection.kind === 'item' ? selection.key : null}
                selectedDay={selection.kind === 'item' ? null : selection.day}
                onSelectItem={(item) => select({ kind: 'item', key: item.key, day: dayKey(item.start) })}
                onNewSlot={(day) => select({ kind: 'new', day: dayKey(day) })}
                onMonth={changeMonth}
              />
            </div>
          </div>

          <section
            aria-label="Détail"
            className={cn('flex flex-col gap-3.5 rounded-[22px] border-2 bg-surface p-4 lg:rounded-[24px] lg:p-[22px]', accent)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.08em] text-muted lg:text-xs lg:tracking-[0.1em]">
                {panelDay ? formatShortDay(panelDay) : ''}
              </span>
              <PanelPill item={selectedItem} />
            </div>
            {notice && (
              <p role="status" className="rounded-[12px] bg-[#E8EEDF] px-3.5 py-3 text-sm font-extrabold text-[#3B5221]">
                {notice}
              </p>
            )}
            {renderPanel()}
          </section>
        </div>
      )}
    </div>
  )
}
