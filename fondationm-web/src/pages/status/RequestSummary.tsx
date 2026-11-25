import type { CurrentUser } from '../../auth/currentUser'
import { SCHOOL_TYPE_LABELS } from '../../lib/referenceData'

interface SummaryRow {
  label: string
  value: string
}

function join(values: readonly (string | null | undefined)[], separator: string): string {
  return values.filter(Boolean).join(separator)
}

/** Lignes de la maquette : école (W1-E1-attente) ou intervenant (W2-E7). */
function summaryRows(user: CurrentUser): SummaryRow[] {
  const details = user.details
  if (details?.kind === 'school') {
    const type = details.schoolType ? SCHOOL_TYPE_LABELS[details.schoolType].toLocaleLowerCase('fr-FR') : ''
    return [
      { label: 'Établissement', value: type ? `${details.schoolName} (${type})` : details.schoolName },
      { label: 'Pays · zone', value: join([details.country, details.city], ' · ') },
      // Maquette : « {Prénom Nom}, {fonction} » ; le nom du référent est absent du contrat.
      { label: 'Référent', value: details.referentRole },
      { label: 'Contact', value: join([user.email, details.phone], ' · ') },
    ].filter((row) => row.value)
  }
  if (details?.kind === 'speaker') {
    const job = details.jobTitle ? details.jobTitle.charAt(0).toLocaleLowerCase('fr-FR') + details.jobTitle.slice(1) : ''
    return [
      { label: 'Intervenant', value: join([details.fullName, job], ', ') },
      { label: 'Structure', value: details.organization },
      { label: 'Pays · zone', value: join([details.country, details.city], ' · ') },
    ].filter((row) => row.value)
  }
  return [{ label: 'E-mail', value: user.email }]
}

export function RequestSummary({ user }: { user: CurrentUser }) {
  const speaker = user.details?.kind === 'speaker' ? user.details : null
  const title = speaker ? 'Votre profil' : 'Votre demande'
  return (
    <section
      aria-labelledby="votre-demande"
      className="flex flex-col gap-3 rounded-[20px] bg-surface p-[18px] md:rounded-[24px] md:p-7"
    >
      <h2 id="votre-demande" className="text-lg uppercase md:text-[22px]">
        {title}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {summaryRows(user).map((row) => (
          <div key={row.label} className="contents">
            <dt className="font-bold text-muted">{row.label}</dt>
            <dd className="font-extrabold">{row.value}</dd>
          </div>
        ))}
      </dl>
      {speaker && speaker.skills.length > 0 && (
        <ul aria-label="Compétences" className="flex flex-wrap gap-2">
          {speaker.skills.map((skill) => (
            <li key={skill} className="rounded-pill bg-canvas px-3 py-[5px] text-[13px] font-extrabold">
              {skill}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
