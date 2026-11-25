import { useState } from 'react'
import { greetingName, type Role } from '../auth/currentUser'
import { useCurrentUser } from '../auth/currentUserContext'
import { useMe } from '../auth/hooks'
import { AccountStatusLayout } from '../components/layout/AccountStatusLayout'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { formatDateTime } from '../lib/formatDate'
import { PendingTimeline, type TimelineStep } from './status/PendingTimeline'
import { RequestSummary } from './status/RequestSummary'

const WHILE_YOU_WAIT: Partial<Record<Role, string>> = {
  SCHOOL:
    'Pensez déjà aux classes et aux métiers qui intéresseraient vos élèves : vous pourrez demander une rencontre dès l’ouverture de votre accès.',
  SPEAKER:
    'Réfléchissez aux moments où vous pourriez intervenir : vous publierez vos créneaux dès la validation de votre compte.',
}

export function PendingAccountPage() {
  const user = useCurrentUser()
  const me = useMe()
  const [stillPending, setStillPending] = useState(false)

  const refresh = async () => {
    setStillPending(false)
    const result = await me.refetch()
    if (result.data?.status === 'PENDING') setStillPending(true)
  }

  const steps: TimelineStep[] = [
    {
      label: 'Demande envoyée',
      detail: user.createdAt ? (formatDateTime(user.createdAt) ?? undefined) : undefined,
      state: 'done',
    },
    { label: 'Vérification', detail: 'En cours par la Fondation M', state: 'current' },
    { label: 'Compte validé', state: 'upcoming' },
    { label: 'Première rencontre', state: 'upcoming' },
  ]

  return (
    <AccountStatusLayout>
      <div className="flex flex-col items-start gap-4">
        <Badge tone="orange">Compte en attente</Badge>
        <h1 className="text-[32px] leading-tight md:text-[42px]">
          Merci {greetingName(user)}, votre demande est bien arrivée
        </h1>
        <p className="text-[15px] font-semibold text-muted">
          Une personne de la Fondation M vérifie votre demande. Vous n’avez rien à faire : revenez vous
          connecter pour voir l’avancement.
        </p>
      </div>

      <PendingTimeline steps={steps} />

      <div className="grid gap-4 md:grid-cols-2">
        <RequestSummary user={user} />
        <section aria-labelledby="en-attendant" className="flex flex-col gap-2 rounded-block bg-indigo p-5">
          <h2 id="en-attendant" className="text-xl text-cream">
            En attendant
          </h2>
          <p className="font-semibold text-white">
            {WHILE_YOU_WAIT[user.role] ?? 'Revenez vous connecter pour voir l’avancement de votre demande.'}
          </p>
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
