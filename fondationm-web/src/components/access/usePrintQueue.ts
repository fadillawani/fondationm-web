import { useState } from 'react'
import { flushSync } from 'react-dom'

/** Classe posée sur <body> le temps d'imprimer : seules les fiches sont imprimées (styles/theme.css). */
export const PRINTING_CLASS = 'impression-fiches'

/**
 * File d'impression des fiches d'accès : les fiches sont rendues (portail), la page est imprimée, puis la file est
 * vidée et `onPrinted` reçoit les fiches imprimées.
 */
export function usePrintQueue<T>() {
  const [queue, setQueue] = useState<readonly T[]>([])

  function print(toPrint: readonly T[], onPrinted: (printed: readonly T[]) => void) {
    if (toPrint.length === 0) return
    flushSync(() => setQueue(toPrint))
    document.body.classList.add(PRINTING_CLASS)
    try {
      window.print()
    } finally {
      document.body.classList.remove(PRINTING_CLASS)
    }
    onPrinted(toPrint)
    setQueue([])
  }

  return { queue, print }
}
