import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { PATHS } from '../../auth/roles'
import { buttonClass } from '../../components/ui/styles'
import { cn } from '../../lib/cn'
import { HeroBackdrop, HeroIllustration, HomePictogram, WeaveBand, type PictogramName } from './HomeIllustrations'
import { FOOTER_TEXT, HERO_TEXT, PROJECT_TEXT, SITE_TITLE } from './homeContent'
import { LoginMenu } from './LoginMenu'
import { useReveal } from './useReveal'


const STEPS = [
  {
    title: 'Inscription',
    icon: 'signup',
    text: "L'établissement et l'intervenant créent leur compte. La Fondation M vérifie et valide chaque inscription.",
  },
  {
    title: 'Demande',
    icon: 'calendar',
    text: "L'intervenant indique ses disponibilités. L'établissement choisit un intervenant et demande une rencontre pour une de ses classes.",
  },
  {
    title: 'Rencontre',
    icon: 'meeting',
    text: "L'intervenant et la Fondation M donnent leur accord, puis la rencontre a lieu en classe.",
  },
  {
    title: 'Retour',
    icon: 'story',
    text: "Après la rencontre, l'établissement et l'intervenant racontent ce qu'ils ont vécu. La Fondation M valide ces retours et les partage avec les mécènes.",
  },
] as const

interface Audience {
  title: string
  icon: PictogramName
  text: string
  /** Fond et texte de la carte (thème de l'espace, contrastes de la décision 143). */
  tone: string
  /** Contour de focus visible sur le fond de la carte. */
  focus: string
  /** Couleur du pictogramme sur sa pastille blanche. */
  iconTone: string
  /** Bouton secondaire (contour) dans la couleur du texte. */
  outline: string
  links: readonly { label: string; to: string; primary: boolean }[]
}

const AUDIENCES: readonly Audience[] = [
  {
    title: 'Établissement scolaire',
    iconTone: 'text-indigo',
    icon: 'school',
    text: "Trouvez des professionnels prêts à rencontrer vos classes, demandez une rencontre et suivez-la jusqu'au retour d'expérience.",
    tone: 'bg-indigo text-cream',
    focus: 'focus-visible:outline-cream',
    outline: 'border-cream text-cream hover:bg-white/10',
    links: [
      { label: 'Inscrire mon établissement', to: PATHS.registerSchool, primary: true },
      { label: 'Connexion établissement', to: PATHS.login, primary: false },
    ],
  },
  {
    title: 'Intervenant',
    iconTone: 'text-terra-dark',
    icon: 'speaker',
    text: 'Vous êtes professionnel ou professionnelle ? Indiquez vos disponibilités, répondez aux demandes des établissements et partagez votre parcours avec des jeunes.',
    tone: 'bg-orange text-ink',
    focus: 'focus-visible:outline-ink',
    outline: 'border-ink text-ink hover:bg-ink/10',
    links: [
      { label: 'Partager mon expérience', to: PATHS.registerSpeaker, primary: true },
      { label: 'Connexion intervenant', to: PATHS.loginSpeaker, primary: false },
    ],
  },
  {
    title: 'Élève',
    iconTone: 'text-ink',
    icon: 'student',
    text: "Retrouve les rencontres prévues pour ta classe et les intervenants que tu vas rencontrer. Ton accès t'est remis par ton établissement.",
    tone: 'bg-yellow text-ink',
    focus: 'focus-visible:outline-ink',
    outline: 'border-ink text-ink hover:bg-ink/10',
    links: [{ label: 'Connexion élève', to: PATHS.loginStudent, primary: true }],
  },
  {
    title: 'Mécène',
    iconTone: 'text-green',
    icon: 'donor',
    text: 'Suivez ce que votre soutien fait naître dans les classes, à travers les retours validés par la Fondation M. Votre accès vous est remis par la Fondation M.',
    tone: 'bg-green text-white',
    focus: 'focus-visible:outline-cream',
    outline: 'border-white text-white hover:bg-white/10',
    links: [{ label: 'Connexion mécène', to: PATHS.loginDonor, primary: true }],
  },
  {
    title: 'Équipe Fondation M',
    iconTone: 'text-terra',
    icon: 'foundation',
    text: 'Validez les comptes, accompagnez les demandes et les rencontres, publiez les retours d’expérience. Réservé à l’équipe de la Fondation M.',
    tone: 'bg-terra text-white',
    focus: 'focus-visible:outline-cream',
    outline: 'border-white text-white hover:bg-white/10',
    links: [{ label: 'Connexion Fondation M', to: PATHS.loginFoundation, primary: true }],
  },
]

const CONTAINER = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8'

/** Montée de 2 px et ombre au survol et au focus (sans déplacement si l'utilisateur réduit les animations). */
const LIFT =
  'vitrine-lift hover:shadow-raised focus-visible:shadow-raised motion-safe:hover:-translate-y-0.5 motion-safe:focus-visible:-translate-y-0.5'

/** Relief des cartes : légère montée et ombre plus marquée au survol et au focus d'un lien. */
const CARD_LIFT =
  'shadow-card hover:shadow-raised focus-within:shadow-raised motion-safe:hover:-translate-y-1 motion-safe:focus-within:-translate-y-1'

/** « Destin » de l'accroche en terracotta (4,71:1 sur `#F7F3EA`) ; le texte lu reste l'accroche validée. */
function HeroTitle() {
  const [before, after] = HERO_TEXT.split(/(?<=Les Tisseurs de )Destin/)
  return (
    <>
      {before}
      <span className="text-terra">Destin</span>
      {after}
    </>
  )
}

function AudienceCard({ audience }: { audience: Audience }) {
  return (
    <li data-reveal className={cn('vitrine-card flex flex-col gap-3 rounded-card p-5 lg:p-6', CARD_LIFT, audience.tone)}>
      <span className={cn('inline-flex size-16 items-center justify-center rounded-[18px] bg-surface shadow-card', audience.iconTone)}>
        <HomePictogram name={audience.icon} />
      </span>
      <h3 className="text-2xl">{audience.title}</h3>
      <p className="flex-1 text-[15px] font-semibold leading-relaxed">{audience.text}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {audience.links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              'inline-flex min-h-touch min-w-touch items-center justify-center rounded-button border-2 px-4 text-[15px] font-extrabold',
              LIFT,
              audience.focus,
              link.primary ? 'border-transparent bg-surface text-ink hover:bg-canvas' : cn('bg-transparent', audience.outline),
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </li>
  )
}

/**
 * Vitrine publique « Les Tisseurs de Destin » (F14) : affichée à « / » sans jeton (décision 137). Aucun appel à l'API :
 * elle s'affiche même si le serveur dort. Animations légères coupées par `prefers-reduced-motion` (décision 147).
 */
export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef)
  useEffect(() => {
    document.title = SITE_TITLE
  }, [])

  return (
    <div ref={rootRef} className="vitrine min-h-dvh overflow-x-clip bg-canvas text-ink">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-button bg-ink px-4 py-3 font-extrabold text-cream focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>
      <header className={cn(CONTAINER, 'relative z-20 flex min-h-20 items-center justify-between gap-3 py-3')}>
        <p className="font-display text-2xl leading-tight sm:text-[28px]">Les Tisseurs de Destin</p>
        <LoginMenu />
      </header>

      <main id="contenu" tabIndex={-1} className="flex flex-col gap-14 pb-16 focus:outline-none lg:gap-20">
        <section aria-labelledby="accroche" className="relative overflow-hidden">
          <div aria-hidden="true" className="absolute inset-y-0 left-[46%] right-0 hidden rounded-bl-[120px] bg-cream-soft lg:block" />
          <HeroBackdrop className="pointer-events-none absolute -right-16 -top-10 hidden h-[620px] w-[660px] lg:block" />
          <div className={cn(CONTAINER, 'relative grid items-center gap-6 pb-10 pt-4 lg:grid-cols-[1.05fr_1fr] lg:pb-16 lg:pt-10')}>
            <div className="flex flex-col gap-7">
              <h1 id="accroche" className="text-[40px] leading-[1.05] sm:text-[54px] lg:text-[66px]">
                <HeroTitle />
              </h1>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to={PATHS.registerSchool} className={buttonClass('primary', { className: LIFT })}>
                  Inscrire mon établissement
                </Link>
                <Link to={PATHS.registerSpeaker} className={buttonClass('outlineInk', { className: LIFT })}>
                  Partager mon expérience
                </Link>
              </div>
            </div>
            <div className="relative rounded-[32px] bg-cream-soft p-3 lg:bg-transparent lg:p-0">
              <HeroIllustration className="mx-auto h-auto w-full max-w-[560px]" />
            </div>
          </div>
        </section>

        <WeaveBand className="mx-auto max-w-6xl" />

        <section id="projet" aria-labelledby="projet-titre" data-reveal className={CONTAINER}>
          <div className="flex flex-col gap-4 rounded-card border-l-[10px] border-terra bg-surface p-6 shadow-card lg:p-10">
            <h2 id="projet-titre" className="text-3xl lg:text-4xl">
              Le projet
            </h2>
            <p className="max-w-3xl text-[17px] font-semibold leading-relaxed lg:text-lg">{PROJECT_TEXT}</p>
          </div>
        </section>

        <section id="comment" aria-labelledby="comment-titre" className={cn(CONTAINER, 'flex flex-col gap-6')}>
          <h2 id="comment-titre" data-reveal className="text-3xl lg:text-4xl">
            Comment ça marche
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} data-reveal className={cn('vitrine-card flex flex-col gap-4 rounded-block bg-surface p-5', CARD_LIFT)}>
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-14 items-center justify-center rounded-pill bg-terra font-display text-3xl text-white shadow-card">
                    {index + 1}
                  </span>
                  <span className="inline-flex size-14 items-center justify-center rounded-[18px] bg-indigo-tint text-indigo">
                    <HomePictogram name={step.icon} />
                  </span>
                </div>
                <h3 className="text-xl">{step.title}</h3>
                <p className="text-[15px] font-semibold leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <WeaveBand className="mx-auto max-w-6xl" />

        <section id="pour-qui" aria-labelledby="pour-qui-titre" className={cn(CONTAINER, 'flex flex-col gap-6')}>
          <h2 id="pour-qui-titre" data-reveal className="text-3xl lg:text-4xl">
            Pour qui ?
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map((audience) => (
              <AudienceCard key={audience.title} audience={audience} />
            ))}
          </ul>
        </section>
      </main>

      <footer className="bg-ink text-cream">
        <WeaveBand onDark />
        <div className={cn(CONTAINER, 'flex flex-col gap-2 py-8')}>
          <p className="text-[15px] font-semibold">{FOOTER_TEXT}</p>
          <p className="font-display text-2xl">Fondation M</p>
        </div>
      </footer>
    </div>
  )
}
