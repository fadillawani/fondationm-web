const DATE_TIME = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

function parse(iso: string): Date | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(iso: string): string | null {
  const date = parse(iso)
  return date === null ? null : DATE_TIME.format(date)
}

/** Date longue en français, sans l'heure : « 20 novembre 2026 ». */
export function formatDate(iso: string | null): string | null {
  const date = iso === null ? null : parse(iso)
  return date === null ? null : DATE.format(date)
}
