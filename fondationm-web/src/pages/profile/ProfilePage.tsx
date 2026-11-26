import { useCallback, useState, type ReactNode } from 'react'
import { useCurrentUser } from '../../auth/currentUserContext'
import { LeaveGuardModal } from '../../components/access/LeaveGuardModal'
import { useLeaveGuard } from '../../components/access/useLeaveGuard'
import { PasswordChangeForm } from '../../components/account/PasswordChangeForm'
import { PageTitle } from '../../components/layout/PageTitle'
import { SCHOOL_TYPE_LABELS, sectorOptionLabel } from '../../lib/referenceData'
import { studentIdentifier } from '../../lib/studentLogin'
import { PhotoField } from './PhotoField'
import { SchoolProfileForm, SpeakerProfileForm } from './ProfileForms'

function Section({ title, children, note }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-[20px] bg-surface p-4 lg:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl">{title}</h2>
        {note && <p className="text-[13px] font-bold text-muted">{note}</p>}
      </div>
      {children}
    </section>
  )
}

function Facts({ facts }: { facts: readonly (readonly [string, string | null])[] }) {
  return (
    <dl className="grid gap-2.5 sm:grid-cols-2">
      {facts.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5 rounded-[14px] bg-canvas px-3.5 py-3">
          <dt className="text-[11px] font-black uppercase text-muted">{label}</dt>
          <dd className="font-black text-ink">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * « Mon profil » de chaque espace (F13, sans maquette, décision 132) : photo ou logo (intervenant, école), informations
 * modifiables ou en lecture seule, mot de passe. Une seule garde de sortie pour la page (formulaire modifié ou envoi
 * d'image en cours).
 */
export function ProfilePage() {
  const user = useCurrentUser()
  const [dirty, setDirty] = useState(false)
  const [sending, setSending] = useState(false)
  const onDirty = useCallback((value: boolean) => setDirty(value), [])
  const onSending = useCallback((value: boolean) => setSending(value), [])
  const blocker = useLeaveGuard(dirty || sending)
  const student = user.role === 'STUDENT'
  const details = user.details

  let photo: ReactNode = null
  let info: ReactNode
  if (user.role === 'SPEAKER' && details?.kind === 'speaker') {
    photo = <PhotoField owner="speaker" name={user.displayName} photoUrl={details.photoUrl} onBusyChange={onSending} />
    info = (
      <Section title="Mes informations" note="Le nom, la ville, le pays et l’e-mail ne se modifient pas ici : écrivez à la Fondation M.">
        <Facts
          facts={[
            ['Nom', details.fullName || user.displayName],
            ['Ville', [details.city, details.country].filter(Boolean).join(', ')],
            ['E-mail', user.email],
            ['Secteur actuel', details.sector ? sectorOptionLabel(details.sector) : null],
          ]}
        />
        <SpeakerProfileForm details={details} onDirtyChange={onDirty} />
      </Section>
    )
  } else if (user.role === 'SCHOOL' && details?.kind === 'school') {
    photo = <PhotoField owner="school" name={user.displayName} photoUrl={details.photoUrl} onBusyChange={onSending} />
    info = (
      <Section title="Mon établissement" note="Le nom, la ville, le pays et l’e-mail ne se modifient pas ici : écrivez à la Fondation M.">
        <Facts
          facts={[
            ['Établissement', details.schoolName || user.displayName],
            ['Ville', [details.city, details.country].filter(Boolean).join(', ')],
            ['E-mail', user.email],
            ['Type actuel', details.schoolType ? SCHOOL_TYPE_LABELS[details.schoolType] : null],
          ]}
        />
        <SchoolProfileForm details={details} onDirtyChange={onDirty} />
      </Section>
    )
  } else if (student) {
    const classTitle = details?.kind === 'student' ? details.classTitle : ''
    info = (
      <Section title="Mes informations" note="Ces informations ne sont pas modifiables ici.">
        <Facts
          facts={[
            ['Nom', user.displayName],
            ['Classe', classTitle || null],
            ['Identifiant', studentIdentifier(user.email)],
          ]}
        />
      </Section>
    )
  } else if (user.role === 'FOUNDATION') {
    info = (
      <Section title="Mon compte" note="Le compte de la Fondation M n’a pas de profil : seuls l’e-mail et le mot de passe le décrivent.">
        <Facts facts={[['E-mail', user.email]]} />
      </Section>
    )
  } else {
    info = (
      <Section title="Mes informations" note="Ces informations ne sont pas modifiables ici.">
        <Facts
          facts={[
            ['Nom', user.displayName],
            ['E-mail', user.email],
          ]}
        />
      </Section>
    )
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <PageTitle kicker="Mon compte" title="Mon profil" />
      {photo}
      {info}
      <Section title="Mot de passe">
        <PasswordChangeForm
          submitLabel="Changer le mot de passe"
          redirect={false}
          fullWidth={false}
          successMessage={student ? 'Ton mot de passe est modifié.' : 'Votre mot de passe est modifié.'}
        />
      </Section>
      <LeaveGuardModal
        blocker={blocker}
        title={sending ? 'Quitter pendant l’envoi ?' : 'Quitter sans enregistrer ?'}
        stayLabel="Rester sur la page"
        message={sending ? 'L’envoi de l’image sera interrompu.' : 'Vos modifications ne sont pas encore enregistrées.'}
      />
    </div>
  )
}
