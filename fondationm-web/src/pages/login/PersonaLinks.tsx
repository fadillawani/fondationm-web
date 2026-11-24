import { Fragment } from 'react'
import { Link } from 'react-router'
import { PATHS } from '../../auth/roles'

const LINK = 'font-extrabold text-indigo underline underline-offset-2 hover:text-ink'

const OTHERS = {
  school: [
    { label: 'Intervenant', to: PATHS.loginSpeaker },
    { label: 'Équipe Fondation M', to: PATHS.loginFoundation },
    { label: 'Mécène', to: PATHS.loginDonor },
    { label: 'Élève', to: PATHS.loginStudent },
  ],
  speaker: [
    { label: 'Établissement', to: PATHS.login },
    { label: 'Équipe Fondation M', to: PATHS.loginFoundation },
    { label: 'Mécène', to: PATHS.loginDonor },
    { label: 'Élève', to: PATHS.loginStudent },
  ],
} as const

/** Bas des connexions école et intervenant : « Vous êtes : Intervenant · Équipe Fondation M · Mécène · Élève ». */
export function PersonaLinks({ current }: { current: keyof typeof OTHERS }) {
  return (
    <nav aria-label="Autres espaces de connexion" className="text-center text-[13px] font-bold text-muted">
      Vous êtes :{' '}
      {OTHERS[current].map((link, index) => (
        <Fragment key={link.to}>
          {index > 0 && ' · '}
          <Link to={link.to} className={LINK}>
            {link.label}
          </Link>
        </Fragment>
      ))}
    </nav>
  )
}

/** Bas des connexions Fondation, donateur et élève. */
export function SchoolOrSpeakerLink() {
  return (
    <p className="text-center text-[13px] font-bold text-muted">
      Vous êtes une école ou un intervenant ?{' '}
      <Link to={PATHS.login} className={LINK}>
        Se connecter
      </Link>
    </p>
  )
}
