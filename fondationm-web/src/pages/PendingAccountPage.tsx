import { useCurrentUser } from '../auth/currentUserContext'
import { useMe } from '../auth/hooks'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { AccountNoticeLayout } from './AccountNoticeLayout'

export function PendingAccountPage() {
  const user = useCurrentUser()
  const me = useMe()

  return (
    <AccountNoticeLayout
      title="Compte en attente de validation"
      badge={<Badge tone="warning">En attente</Badge>}
      actions={
        <Button onClick={() => void me.refetch()} loading={me.isFetching}>
          Vérifier à nouveau
        </Button>
      }
    >
      <p>Merci pour votre inscription, {user.displayName} !</p>
      <p className="text-muted">
        L'équipe de la Fondation M vérifie votre compte. Vous pourrez accéder à votre espace dès
        qu'il sera validé.
      </p>
    </AccountNoticeLayout>
  )
}
