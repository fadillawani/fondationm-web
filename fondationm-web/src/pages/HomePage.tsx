import { useCurrentUser } from '../auth/currentUserContext'
import { ROLE_LABEL } from '../auth/roles'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'

export function HomePage() {
  const user = useCurrentUser()

  return (
    <>
      <PageHeader title={`Bonjour ${user.displayName} !`} subtitle={`Espace ${ROLE_LABEL[user.role]}`} />
      <Card>
        <EmptyState
          title="Votre espace se prépare"
          description="Les fonctionnalités de votre espace arrivent très bientôt. Merci pour votre patience !"
        />
      </Card>
    </>
  )
}
