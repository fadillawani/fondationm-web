import { useLogout } from '../auth/hooks'
import { PasswordChangeForm } from '../components/account/PasswordChangeForm'
import { CenteredLayout } from '../components/layout/CenteredLayout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function MustChangePasswordPage() {
  const logout = useLogout()

  return (
    <CenteredLayout>
      <Card className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] leading-tight">Choisissez votre mot de passe</h1>
          <p className="text-sm font-semibold text-muted">
            Votre mot de passe a été remis par votre établissement ou par la Fondation M. Pour protéger
            votre compte, choisissez-en un nouveau avant de continuer.
          </p>
        </div>

        <PasswordChangeForm
          submitLabel="Enregistrer mon mot de passe"
          extraActions={
            <Button variant="secondary" fullWidth size="md" onClick={logout}>
              Se déconnecter
            </Button>
          }
        />
      </Card>
    </CenteredLayout>
  )
}
