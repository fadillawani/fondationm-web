import { useState } from 'react'
import { greetingName, type CurrentUser } from '../auth/currentUser'
import { useCurrentUser } from '../auth/currentUserContext'
import { useMe } from '../auth/hooks'
import { AccountStatusLayout } from '../components/layout/AccountStatusLayout'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/cn'
import { parseIso } from '../lib/dateTime'
import { PendingTimeline, type TimelineStep } from './status/PendingTimeline'
import { RequestSummary } from './status/RequestSummary'

const SHORT_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

/** « Terminé · 12 nov, 16h42 » (maquette). */
function sentDetail(iso: string | null): string {
  const date = parseIso(iso)
  if (date === null) return 'Terminé'
  const time = `${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`
  return `Terminé · ${SHORT_DATE.format(date).replace('.', '')}, ${time}`
}

interface PendingTexts {
  badge: string
  title: string
  intro: string
  mobileIntro: string
  who: string
  steps: TimelineStep[]
  waitTitle: string
  wait: string
  mobileWait: string
  waitTone: string
}

/**
 * Textes de la maquette (W1-E1-attente pour l'école, W2-E7 pour l'intervenant). Les phrases qui
 * promettent un e-mail (« nous vous écrirons… », « e-mail de bienvenue ») sont retirées : le backend
 * n'en envoie pas (décision G6).
 */
function textsFor(user: CurrentUser): PendingTexts {
  const sent = { label: 'Demande envoyée', detail: sentDetail(user.createdAt), state: 'done' as const }
  const checking = { label: 'Vérification', detail: 'En cours par la Fondation M', state: 'current' as const }
  const validated = { label: 'Compte validé', detail: 'À venir', state: 'upcoming' as const }
  if (user.details?.kind === 'speaker') {
    return {
      badge: 'Compte en attente de validation',
      title: `Merci ${greetingName(user)}, les jeunes vont avoir de la chance`,
      intro:
        'Une personne de la Fondation M relit votre demande. Ce n’est pas une sélection : nous vérifions simplement votre identité. Revenez vous connecter pour voir l’avancement.',
      mobileIntro:
        'Une personne de la Fondation M relit votre demande. Ce n’est pas une sélection : nous vérifions simplement votre identité.',
      who: `${user.displayName} · intervenant`,
      steps: [sent, checking, validated, { label: 'Vos créneaux', detail: 'À venir · publiez vos disponibilités', state: 'upcoming' }],
      waitTitle: 'En attendant',
      wait: 'Repensez à vos 17 ans : qu’auriez-vous aimé qu’un professionnel vous dise ? C’est souvent ce qui touche le plus les élèves.',
      mobileWait: 'Repensez à vos 17 ans : qu’auriez-vous aimé qu’un professionnel vous dise ?',
      waitTone: 'bg-ink',
    }
  }
  const schoolName = user.details?.kind === 'school' ? user.details.schoolName : user.displayName
  return {
    badge: 'Compte en attente',
    title: `Merci ${greetingName(user)}, votre demande est bien arrivée`,
    intro: `Une personne de la Fondation M vérifie que ${schoolName} existe et que vous en êtes le référent. Vous n’avez rien à faire : revenez vous connecter pour voir l’avancement.`,
    mobileIntro: 'Une personne de la Fondation M vérifie votre établissement. Vous n’avez rien à faire.',
    who: schoolName,
    steps: [sent, checking, validated, { label: 'Première rencontre', detail: 'À venir · choisissez un intervenant', state: 'upcoming' }],
    waitTitle: 'En attendant',
    wait: 'Demandez à vos élèves quels métiers les font rêver : ce sera le meilleur point de départ pour choisir votre premier intervenant.',
    mobileWait: 'Demandez à vos élèves quels métiers les font rêver : ce sera le point de départ de votre première rencontre.',
    waitTone: 'bg-indigo',
  }
}

export function PendingAccountPage() {
  const user = useCurrentUser()
  const me = useMe()
  const [stillPending, setStillPending] = useState(false)
  const texts = textsFor(user)

  const refresh = async () => {
    setStillPending(false)
    const result = await me.refetch()
    if (result.data?.status === 'PENDING') setStillPending(true)
  }

  return (
    <AccountStatusLayout who={texts.who}>
      <section className="flex flex-col gap-6 rounded-[24px] bg-surface p-[22px] md:rounded-[28px] md:p-10">
        <div className="flex flex-col items-start gap-3">
          <span className="rounded-pill bg-orange px-3 py-[5px] text-xs font-black text-ink md:px-3.5 md:py-1.5 md:text-[13px]">
            {texts.badge}
          </span>
          <h1 className="text-[30px] leading-[1.05] md:text-[42px]">{texts.title}</h1>
          <p className="hidden text-base font-semibold text-muted md:block">{texts.intro}</p>
          <p className="text-sm font-semibold text-muted md:hidden">{texts.mobileIntro}</p>
        </div>
        <PendingTimeline steps={texts.steps} />
      </section>

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <RequestSummary user={user} />
        <section
          aria-labelledby="en-attendant"
          className={cn('flex flex-col gap-3 rounded-[20px] p-[18px] text-white md:rounded-[24px] md:p-7', texts.waitTone)}
        >
          <h2 id="en-attendant" className="text-lg uppercase text-cream md:text-[22px]">
            {texts.waitTitle}
          </h2>
          <p className="hidden text-sm font-semibold md:block">{texts.wait}</p>
          <p className="text-sm font-semibold md:hidden">{texts.mobileWait}</p>
          {user.details?.kind !== 'speaker' && (
            <span
              title="La charte sera bientôt disponible"
              className="cursor-not-allowed text-sm font-black text-cream underline decoration-dotted underline-offset-2"
            >
              Lire la charte des rencontres
            </span>
          )}
        </section>
      </div>

      {stillPending && !me.isFetching && (
        <Alert tone="info">Votre demande est toujours en cours de vérification. Merci de votre patience !</Alert>
      )}
      {me.isError && !me.isFetching && <Alert tone="error">Impossible d’actualiser votre statut pour le moment.</Alert>}

      <div>
        <Button variant="secondary" onClick={() => void refresh()} loading={me.isFetching}>
          Actualiser mon statut
        </Button>
      </div>
    </AccountStatusLayout>
  )
}
