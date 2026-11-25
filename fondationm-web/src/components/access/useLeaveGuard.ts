import { useEffect } from 'react'
import { useBlocker } from 'react-router'
import { tokenStorage } from '../../auth/tokenStorage'

/**
 * Avertit avant de quitter une page qui affiche des codes non imprimés : `beforeunload` (fermeture, rechargement)
 * et blocage de la navigation dans l'application, sauf en fin de session (le jeton est déjà effacé).
 */
export function useLeaveGuard(active: boolean) {
  useEffect(() => {
    if (!active) return undefined
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active])
  return useBlocker(
    ({ currentLocation, nextLocation }) =>
      active && tokenStorage.get() !== null && currentLocation.pathname !== nextLocation.pathname,
  )
}
