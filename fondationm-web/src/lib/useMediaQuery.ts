import { useSyncExternalStore } from 'react'

/** Vrai si la requête média correspond ; faux sans `matchMedia` (tests, rendu sans fenêtre). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => undefined
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
  )
}

/** Barre latérale et mise en page PC à partir de 1024 px (`lg`). */
export const DESKTOP_QUERY = '(min-width: 1024px)'
