import { createContext, useContext } from 'react'
import type { CurrentUser } from './currentUser'

export const CurrentUserContext = createContext<CurrentUser | null>(null)

export function useCurrentUser(): CurrentUser {
  const user = useContext(CurrentUserContext)
  if (user === null) throw new Error('useCurrentUser doit être utilisé sous RequireAuth.')
  return user
}
