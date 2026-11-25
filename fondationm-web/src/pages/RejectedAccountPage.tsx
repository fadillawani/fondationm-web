import { useCurrentUser } from '../auth/currentUserContext'
import { useLogout } from '../auth/hooks'
import { AccountStatusLayout } from '../components/layout/AccountStatusLayout'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { CONTACT_EMAIL } from '../lib/referenceData'

export function RejectedAccountPage() {
  const user = useCurrentUser()
  const logout = useLogout()

  return (
    <AccountStatusLayout>
      <div className="flex flex-col items-start gap-4">
        <Badge tone="danger">Demande refusée</Badge>
        <h1 className="text-[32px] leading-tight md:text-[42px]">Votre demande n’a pas pu être acceptée</h1>
      </div>

      <section aria-labelledby="motif" className="rounded-block border-l-[6px] border-red bg-red-tint p-5 text-red">
        <h2 id="motif" className="text-xs font-black uppercase tracking-[0.12em]">
          Motif indiqué par la Fondation M
        </h2>
        <p className="mt-2 text-lg font-bold text-ink">
          {user.rejectionReason ?? 'Aucun motif n’a été précisé.'}
        </p>
      </section>

      <p className="font-semibold text-muted">
        Pour toute question, écrivez à{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-extrabold text-indigo underline underline-offset-2">
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <div>
        <Button onClick={logout}>Se déconnecter</Button>
      </div>
    </AccountStatusLayout>
  )
}
