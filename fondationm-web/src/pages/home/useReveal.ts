import { useEffect, type RefObject } from 'react'

/** Classe posée sur la racine quand l'apparition au défilement est active (voir `styles/theme.css`). */
export const REVEAL_ACTIVE = 'vitrine-anime'
export const REVEAL_DONE = 'is-visible'

/**
 * Apparition douce des éléments `[data-reveal]` de la vitrine (décision 147), une seule fois chacun.
 * Rien n'est masqué tant que ce code n'a pas tourné : sans JavaScript, sans `IntersectionObserver` ou avec
 * `prefers-reduced-motion: reduce`, la classe n'est jamais posée et tout reste visible d'emblée.
 */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = root.current
    if (element === null || typeof IntersectionObserver === 'undefined' || typeof window.matchMedia !== 'function') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add(REVEAL_DONE)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
    )
    for (const target of element.querySelectorAll('[data-reveal]')) observer.observe(target)
    element.classList.add(REVEAL_ACTIVE)

    return () => {
      observer.disconnect()
      element.classList.remove(REVEAL_ACTIVE)
    }
  }, [root])
}
