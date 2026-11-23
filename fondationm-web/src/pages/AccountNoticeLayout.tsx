import type { ReactNode } from 'react'
import { useLogout } from '../auth/hooks'
import { CenteredLayout } from '../components/layout/CenteredLayout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

interface AccountNoticeLayoutProps {
  title: string
  badge: ReactNode
  children: ReactNode
  actions?: ReactNode
}

export function AccountNoticeLayout({ title, badge, children, actions }: AccountNoticeLayoutProps) {
  const logout = useLogout()

  return (
    <CenteredLayout>
      <Card className="flex flex-col gap-4">
        <div>{badge}</div>
        <h1 className="text-[32px] leading-tight">{title}</h1>
        <div className="flex flex-col gap-3 font-semibold">{children}</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {actions}
          <Button variant="ghost" onClick={logout}>
            Se déconnecter
          </Button>
        </div>
      </Card>
    </CenteredLayout>
  )
}
