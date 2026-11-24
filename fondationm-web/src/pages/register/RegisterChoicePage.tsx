import { Link } from 'react-router'
import { ONLINE_MEETINGS_ENABLED } from '../../lib/features'
import { PATHS } from '../../auth/roles'
import { CenteredLayout } from '../../components/layout/CenteredLayout'
import { cn } from '../../lib/cn'

interface ChoiceCardProps {
  to: string
  title: string
  description: string
  className: string
}

function ChoiceCard({ to, title, description, className }: ChoiceCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex min-h-48 flex-col justify-between gap-6 rounded-card p-6 shadow-card transition-transform hover:-translate-y-0.5 md:p-8',
        className,
      )}
    >
      <span className="flex flex-col gap-3">
        <span className="font-display text-[28px] leading-none">{title}</span>
        <span className="text-[15px] font-semibold">{description}</span>
      </span>
      <span aria-hidden="true" className="font-display text-xl">
        Commencer →
      </span>
    </Link>
  )
}

export function RegisterChoicePage() {
  return (
    <CenteredLayout wide>
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-[32px] leading-tight md:text-[42px]">Créer un compte</h1>
          <p className="mt-1 text-[15px] font-semibold text-muted">Dites-nous qui vous êtes pour commencer.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ChoiceCard
            to={PATHS.registerSchool}
            title="Je représente un établissement"
            description="Lycées, collèges et centres de formation : faites venir des professionnels dans vos classes."
            className="bg-terra text-white"
          />
          <ChoiceCard
            to={PATHS.registerSpeaker}
            title="Je suis un professionnel et je veux transmettre"
            description={
              ONLINE_MEETINGS_ENABLED
                ? 'Partagez votre métier avec des élèves, en classe ou en ligne, à votre rythme.'
                : 'Partagez votre métier avec des élèves, en classe, à votre rythme.'
            }
            className="bg-orange text-ink"
          />
        </div>
        <p className="text-center text-sm font-semibold text-muted">
          Déjà un compte ?{' '}
          <Link to={PATHS.login} className="font-extrabold text-indigo underline underline-offset-2">
            Se connecter
          </Link>
        </p>
      </div>
    </CenteredLayout>
  )
}
