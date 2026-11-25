import { LoginSplitLayout } from '../../components/layout/LoginSplitLayout'
import { cn } from '../../lib/cn'
import { LoginForm } from './LoginForm'
import { SchoolOrSpeakerLink } from './PersonaLinks'

/** Pastilles de la colonne W5 ; « Artisanat » en encre sur orange (blanc : 2,82:1, sous le seuil). */
const SECTOR_PILLS = [
  { label: 'Santé', className: 'bg-red text-white' },
  { label: 'Numérique', className: 'bg-indigo text-white' },
  { label: 'Agriculture', className: 'bg-green text-white' },
  { label: 'Finance', className: 'bg-surface text-ink' },
  { label: 'Artisanat', className: 'bg-orange text-ink' },
  { label: 'Droit', className: 'bg-ink text-cream' },
] as const

/** `/connexion/eleve` (maquette W5-E1-connexion) : identifiant de la fiche d'accès, tutoiement. */
export function StudentLoginPage() {
  return (
    <LoginSplitLayout
      tone="yellow"
      eyebrow="Espace élève"
      title="Des pros viennent te parler de leur métier"
      intro="Découvre qui va rencontrer ta classe, quand, et ce qu'il ou elle sait faire. Retrouve aussi toutes les rencontres que tu as déjà vécues."
      mobileIntro="Découvre qui va rencontrer ta classe, et retrouve les rencontres déjà vécues."
      note="Ton accès t'a été remis par ton établissement."
      extra={
        <ul aria-label="Des métiers de tous les secteurs" className="flex max-w-[480px] flex-wrap gap-2.5">
          {SECTOR_PILLS.map((pill) => (
            <li key={pill.label} className={cn('rounded-pill px-3.5 py-2 text-sm font-black', pill.className)}>
              {pill.label}
            </li>
          ))}
        </ul>
      }
    >
      <LoginForm
        mode="student"
        title="Content de te voir !"
        subtitle="Utilise l'identifiant et le code de ta fiche d'accès."
        submitLabel="Entrer"
        variant="ink"
        footer="Code oublié ? Demande une nouvelle fiche à ton référent orientation."
      />
      <SchoolOrSpeakerLink />
    </LoginSplitLayout>
  )
}
