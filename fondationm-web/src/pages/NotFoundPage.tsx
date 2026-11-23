import { Link } from 'react-router'
import { CenteredLayout } from '../components/layout/CenteredLayout'
import { EmptyState } from '../components/ui/EmptyState'
import { buttonClass } from '../components/ui/styles'

export function NotFoundPage() {
  return (
    <CenteredLayout>
      <EmptyState
        title="Page introuvable"
        description="La page que vous cherchez n'existe pas ou a été déplacée."
        action={
          <Link to="/" className={buttonClass('primary')}>
            Revenir à l'accueil
          </Link>
        }
      />
    </CenteredLayout>
  )
}
