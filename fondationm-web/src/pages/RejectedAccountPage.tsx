import { useCurrentUser } from '../auth/currentUserContext'
import { Badge } from '../components/ui/Badge'
import { AccountNoticeLayout } from './AccountNoticeLayout'

export function RejectedAccountPage() {
  const user = useCurrentUser()

  return (
    <AccountNoticeLayout title="Compte refusé" badge={<Badge tone="danger">Refusé</Badge>}>
      <p>Nous sommes désolés, votre demande d'inscription n'a pas été acceptée.</p>
      {user.rejectionReason && (
        <p>
          <span className="font-bold">Motif : </span>
          {user.rejectionReason}
        </p>
      )}
      <p className="text-muted">Pour toute question, contactez la Fondation M.</p>
    </AccountNoticeLayout>
  )
}
