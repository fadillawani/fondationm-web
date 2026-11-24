import { dayKey, formatSlot, parseIso, startOfDay } from '../../lib/dateTime'
import type { Meeting, MeetingStatus, Slot } from './speakerData'

/** États de l'agenda, toujours affichés avec un libellé texte. */
export type AgendaState = 'FREE' | 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CLOSED'

export const AGENDA_STATES: readonly AgendaState[] = ['FREE', 'REQUESTED', 'CONFIRMED', 'COMPLETED', 'CLOSED']

export const STATE_LABEL: Record<AgendaState, string> = {
  FREE: 'Libre',
  REQUESTED: 'Demandé',
  CONFIRMED: 'Confirmé',
  COMPLETED: 'Réalisé',
  CLOSED: 'Annulé ou refusé',
}

export const STATE_SHORT: Record<AgendaState, string> = { ...STATE_LABEL, CLOSED: 'Annulé' }

/** Classes Tailwind par état (contraste du texte ≥ 4,5:1). */
export const STATE_CLASS: Record<AgendaState, string> = {
  // Maquette W2-E8 : Libre blanc à bordure pointillée verte, Annulé barré.
  FREE: 'border-2 border-dashed border-green bg-surface text-[#3B5221]',
  REQUESTED: 'border-2 border-transparent bg-yellow text-ink',
  CONFIRMED: 'border-2 border-transparent bg-green text-white',
  COMPLETED: 'border-2 border-transparent bg-indigo text-cream',
  CLOSED: 'border-2 border-transparent bg-line text-muted line-through',
}

/** Un élément de l'agenda : un créneau (chargé ou connu par ses rencontres) et ses rencontres. */
export interface AgendaItem {
  key: string
  state: AgendaState
  start: Date
  end: Date
  slot: Slot | null
  meetings: Meeting[]
  /** Rencontre qui donne l'état (confirmée, réalisée, ou la plus récente des clôturées). */
  main: Meeting | null
}

const CLOSED: readonly MeetingStatus[] = ['REFUSED', 'CANCELLED']

function stateOf(slot: Slot | null, meetings: readonly Meeting[]): { state: AgendaState; main: Meeting | null } | null {
  const find = (status: MeetingStatus) => meetings.find((meeting) => meeting.status === status) ?? null
  const confirmed = find('CONFIRMED')
  if (confirmed) return { state: 'CONFIRMED', main: confirmed }
  const completed = find('COMPLETED')
  if (completed) return { state: 'COMPLETED', main: completed }
  if (find('PENDING')) return { state: 'REQUESTED', main: null }
  if (slot?.status === 'AVAILABLE') return { state: 'FREE', main: null }
  const closed = meetings.filter((meeting) => CLOSED.includes(meeting.status))
  const last = closed[closed.length - 1]
  if (last) return { state: 'CLOSED', main: last }
  return null
}

/**
 * Un élément par créneau. Priorité : Confirmé > Réalisé > Demandé > Libre > Annulé ou refusé
 * (ce dernier seulement s'il ne reste que des rencontres refusées ou annulées).
 */
export function buildAgenda(slots: readonly Slot[], meetings: readonly Meeting[]): AgendaItem[] {
  const groups = new Map<string, { slot: Slot | null; meetings: Meeting[] }>()
  for (const slot of slots) groups.set(slot.id, { slot, meetings: [] })
  for (const meeting of meetings) {
    if (meeting.slot === null) continue
    const key = meeting.slot.id ?? `rencontre-${meeting.id}`
    const group = groups.get(key) ?? { slot: null, meetings: [] }
    group.meetings.push(meeting)
    groups.set(key, group)
  }

  const items: AgendaItem[] = []
  for (const [key, group] of groups) {
    const result = stateOf(group.slot, group.meetings)
    const reference = group.slot ?? group.meetings[0]?.slot ?? null
    const start = parseIso(reference?.startAt ?? null)
    const end = parseIso(reference?.endAt ?? null)
    if (result === null || start === null || end === null) continue
    items.push({ key, start, end, slot: group.slot, meetings: group.meetings, ...result })
  }
  return items.toSorted((a, b) => a.start.getTime() - b.start.getTime())
}

export function groupByDay(items: readonly AgendaItem[]): Map<string, AgendaItem[]> {
  const days = new Map<string, AgendaItem[]>()
  for (const item of items) {
    const key = dayKey(item.start)
    days.set(key, [...(days.get(key) ?? []), item])
  }
  return days
}

/** Jour où l'on peut encore publier un créneau (aujourd'hui compris s'il reste un quart d'heure). */
export function canPublishOn(day: Date, now: Date): boolean {
  const today = startOfDay(now)
  if (day.getTime() > today.getTime()) return true
  if (day.getTime() < today.getTime()) return false
  return now.getHours() * 60 + now.getMinutes() < 23 * 60 + 30
}

/** Libellé complet d'un élément (ARIA) : « Libre, Mardi 24 novembre, 10h00 – 11h30 ». */
export function itemLabel(item: AgendaItem): string {
  const who = item.main?.schoolName
  return `${STATE_LABEL[item.state]}, ${formatSlot(item.start, item.end)}${who ? `, ${who}` : ''}`
}

/**
 * Texte de la pastille d'agenda (maquette W2-E8) : « 10h00 · Libre », « 10h00 · 2 demandes »,
 * « 10h00 · Attente FM » (demandes déjà acceptées), « 10h00 · Thiès » (rencontre : ville de l'école),
 * « Kolda · annulée / refusée » (rencontre clôturée).
 */
export function chipText(item: AgendaItem, time: string): string {
  if (item.state === 'FREE') return `${time} · Libre`
  if (item.state === 'REQUESTED') {
    const toAnswer = item.meetings.filter((meeting) => meeting.status === 'PENDING' && meeting.myDecision === 'PENDING').length
    return toAnswer > 0 ? `${time} · ${toAnswer} demande${toAnswer > 1 ? 's' : ''}` : `${time} · Attente FM`
  }
  const where = item.main?.schoolCity || item.main?.schoolName || ''
  if (item.state === 'CLOSED') {
    const what = item.main?.status === 'CANCELLED' ? 'annulée' : 'refusée'
    return where ? `${where} · ${what}` : `${time} · ${what}`
  }
  return where ? `${time} · ${where}` : time
}

/** Bordure du panneau de détail selon l'état (maquette). */
export const STATE_ACCENT: Record<AgendaState, string> = {
  FREE: 'border-green',
  REQUESTED: 'border-yellow',
  CONFIRMED: 'border-green',
  COMPLETED: 'border-indigo',
  CLOSED: 'border-[#B8AE98]',
}

/** Pastille du calendrier compact (maquette mobile) : Libre en pointillé, Annulé `#C9BFA8`. */
export const STATE_DOT: Record<AgendaState, string> = {
  FREE: 'border-2 border-dashed border-green',
  REQUESTED: 'bg-yellow',
  CONFIRMED: 'bg-green',
  COMPLETED: 'bg-indigo',
  CLOSED: 'bg-[#C9BFA8]',
}
