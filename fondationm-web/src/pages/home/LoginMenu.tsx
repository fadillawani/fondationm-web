import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '../../components/ui/styles'
import { LOGIN_ENTRIES } from './homeContent'

/**
 * « Se connecter » de l'en-tête de la vitrine (décision 139) : bouton à volet, cinq espaces de connexion.
 * Échap ferme et rend le focus au bouton ; un clic à l'extérieur ferme.
 */
export function LoginMenu() {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onPointer = (event: MouseEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={buttonClass('secondary', { size: 'md', className: 'shrink-0 whitespace-nowrap' })}
      >
        Se connecter
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="size-4">
          <path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
        </svg>
      </button>
      <nav
        id={menuId}
        hidden={!open}
        aria-label="Espaces de connexion"
        className="absolute right-0 top-full z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-block border-2 border-line bg-surface p-2 text-ink shadow-raised"
      >
        <ul className="flex flex-col">
          {LOGIN_ENTRIES.map((entry) => (
            <li key={entry.to}>
              <Link
                to={entry.to}
                onClick={() => setOpen(false)}
                className="flex min-h-touch items-center rounded-field px-3 font-extrabold hover:bg-canvas"
              >
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
