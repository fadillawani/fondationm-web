import { useEffect, useId, useRef, useState } from 'react'
import { useCurrentUser } from '../../auth/currentUserContext'
import { useLogout } from '../../auth/hooks'
import { Link } from 'react-router'
import { accountCard, profilePath } from '../../auth/roles'
import { cn } from '../../lib/cn'
import { initialsOf } from '../../lib/initials'
import { Avatar } from '../ui/Avatar'
import { LogoutIcon } from './icons'
import { ROLE_THEME } from './roleTheme'

/**
 * Avatar de l'en-tête de page mobile (44 px, rayon 14) : ouvre un petit menu avec « Se déconnecter ».
 * La maquette n'a pas de déconnexion sur mobile ; elle reste indispensable (écart noté).
 */
export function UserMenu({ className }: { className?: string }) {
  const user = useCurrentUser()
  const logout = useLogout()
  const card = accountCard(user)
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={`Menu du compte : ${card.name}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex size-11 items-center justify-center rounded-[14px] font-display text-[17px] leading-none',
          ROLE_THEME[user.role].avatar,
        )}
      >
        <Avatar photoUrl={card.photoUrl} kind={card.photoKind ?? 'photo'} className="inline-flex size-full items-center justify-center rounded-[14px]">
          {initialsOf(card.name, card.initials)}
        </Avatar>
      </button>
      <div
        id={menuId}
        hidden={!open}
        className="absolute right-0 top-full z-50 mt-2 w-60 rounded-block border-2 border-line bg-surface p-3 text-ink shadow-raised"
      >
        <p className="truncate px-1 font-black">{card.name}</p>
        {card.detail && <p className="truncate px-1 text-sm font-bold text-muted">{card.detail}</p>}
        <Link
          to={profilePath(user.role)}
          onClick={() => setOpen(false)}
          className="mt-2 flex min-h-touch w-full items-center gap-2 rounded-field px-2 font-extrabold hover:bg-canvas"
        >
          Mon profil
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex min-h-touch w-full items-center gap-2 rounded-field px-2 font-extrabold hover:bg-canvas"
        >
          <LogoutIcon className="size-5" />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
