import { useCurrentUser } from '../auth/currentUserContext'
import { ROLE_LABEL } from '../auth/roles'
import { PageTitle } from '../components/layout/PageTitle'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'

export function HomePage() {
  const user = useCurrentUser()

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={`Bonjour ${user.displayName} !`} kicker={`Espace ${ROLE_LABEL[user.role]}`} />
      <Card>
        <EmptyState
          title="Votre espace se prépare"
          description="Les fonctionnalités de votre espace arrivent très bientôt. Merci pour votre patience !"
        />
      </Card>
    </div>
  )
}
