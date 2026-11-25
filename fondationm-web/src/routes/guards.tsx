import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import { errorMessage } from '../api/errors'
import type { Role } from '../auth/currentUser'
import { CurrentUserContext, useCurrentUser } from '../auth/currentUserContext'
import { meQuery } from '../auth/hooks'
import { PATHS, ROLE_HOME, destinationFor } from '../auth/roles'
import { tokenStorage } from '../auth/tokenStorage'
import { CenteredLayout } from '../components/layout/CenteredLayout'
import { ErrorState } from '../components/ui/ErrorState'
import { Spinner } from '../components/ui/Spinner'

export function GuestOnly({ children }: { children: ReactNode }) {
  if (tokenStorage.get() !== null) return <Navigate to="/" replace />
  return children
}

export function RequireAuth() {
  const token = tokenStorage.get()
  const me = useQuery({ ...meQuery, enabled: token !== null })
  const queryClient = useQueryClient()

  // Fin de session : le cache est vidé une fois l'espace connecté démonté, quand plus aucune page
  // ne peut relancer ses requêtes (sans jeton).
  useEffect(
    () => () => {
      if (tokenStorage.get() === null) queryClient.clear()
    },
    [queryClient],
  )

  if (token === null) return <Navigate to={PATHS.login} replace />

  if (me.isPending) {
    return (
      <CenteredLayout>
        <div className="flex justify-center text-terra">
          <Spinner label="Chargement de votre espace…" size="lg" />
        </div>
      </CenteredLayout>
    )
  }

  if (me.isError) {
    return (
      <CenteredLayout>
        <ErrorState
          message={errorMessage(me.error)}
          onRetry={() => void me.refetch()}
          retrying={me.isFetching}
        />
      </CenteredLayout>
    )
  }

  return (
    <CurrentUserContext value={me.data}>
      <Outlet />
    </CurrentUserContext>
  )
}

export function HomeRedirect() {
  return <Navigate to={destinationFor(useCurrentUser())} replace />
}

export function RequireDestination({ path, children }: { path: string; children: ReactNode }) {
  const destination = destinationFor(useCurrentUser())
  if (destination !== path) return <Navigate to={destination} replace />
  return children
}

export function RequireRole({ roles }: { roles: readonly Role[] }) {
  const user = useCurrentUser()
  const destination = destinationFor(user)

  if (destination !== ROLE_HOME[user.role]) return <Navigate to={destination} replace />
  if (!roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />
  return <Outlet />
}
