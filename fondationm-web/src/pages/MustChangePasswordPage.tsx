import { Badge } from '../components/ui/Badge'
import { AccountNoticeLayout } from './AccountNoticeLayout'

export function MustChangePasswordPage() {
  return (
    <AccountNoticeLayout
      title="Changement de mot de passe obligatoire"
      badge={<Badge tone="primary">Sécurité</Badge>}
    >
      <p>
        Pour protéger votre compte, vous devez choisir un nouveau mot de passe avant d'accéder à
        votre espace.
      </p>
      <p className="text-muted">
        Le formulaire de changement sera disponible très bientôt. En attendant, vous pouvez vous
        déconnecter.
      </p>
    </AccountNoticeLayout>
  )
}
