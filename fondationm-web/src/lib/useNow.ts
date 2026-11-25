import { useEffect, useState } from 'react'

/** Heure courante, rafraîchie chaque minute (jours passés / à venir de l'agenda). */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}
