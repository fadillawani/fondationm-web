import type { CurrentUser } from '../../auth/currentUser'
import { SCHOOL_TYPE_LABELS, SECTOR_LABELS } from '../../lib/referenceData'

interface SummaryRow {
  label: string
  value: string
}

function join(values: readonly string[], separator: string): string {
  return values.filter(Boolean).join(separator)
}

function summaryRows(user: CurrentUser): SummaryRow[] {
  const details = user.details
  if (details?.kind === 'school') {
    return [
      {
        label: 'Établissement',
        value: join([details.schoolName, details.schoolType ? SCHOOL_TYPE_LABELS[details.schoolType] : ''], ' · '),
      },
      { label: 'Pays et ville', value: join([details.city, details.country], ', ') },
      { label: 'Fonction', value: details.referentRole },
      { label: 'Contact', value: join([user.email, details.phone], ' · ') },
    ].filter((row) => row.value)
  }
  if (details?.kind === 'speaker') {
    return [
      { label: 'Métier', value: details.jobTitle },
      { label: 'Structure', value: details.organization },
      { label: 'Secteur', value: details.sector ? SECTOR_LABELS[details.sector].name : '' },
      { label: 'Ville', value: join([details.city, details.country], ', ') },
    ].filter((row) => row.value)
  }
  return [{ label: 'E-mail', value: user.email }]
}

export function RequestSummary({ user }: { user: CurrentUser }) {
  return (
    <section aria-labelledby="votre-demande" className="flex flex-col gap-3 rounded-block border-2 border-line p-5">
      <h2 id="votre-demande" className="text-xl">
        Votre demande
      </h2>
      <dl className="flex flex-col gap-2">
        {summaryRows(user).map((row) => (
          <div key={row.label} className="flex flex-col">
            <dt className="text-xs font-black uppercase tracking-[0.08em] text-muted">{row.label}</dt>
            <dd className="font-bold">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
