import { cn } from '../../lib/cn'
import { initialsOf } from '../../lib/initials'
import type { PhotoKind } from '../../lib/photo'
import { Avatar } from './Avatar'

type InitialsTone = 'school' | 'speaker' | 'user'

const TONES: Record<InitialsTone, string> = {
  school: 'bg-indigo text-cream',
  speaker: 'bg-orange text-ink',
  user: 'bg-cream text-terra-dark',
}


interface InitialsProps {
  name: string
  tone: InitialsTone
  /** 'list' : avatar de liste de la maquette (46 px, rayon 14). */
  size?: 'md' | 'lg' | 'list' | 'detail'
  max?: number
  /** Photo ou logo (F13) : remplace les initiales à taille égale. */
  photoUrl?: string | null
}

export function Initials({ name, tone, size = 'md', max = 2, photoUrl = null }: InitialsProps) {
  const kind: PhotoKind = tone === 'school' ? 'logo' : 'photo'
  return (
    <Avatar
      photoUrl={photoUrl}
      kind={kind}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-display leading-none',
        size === 'lg'
          ? 'size-16 rounded-pill text-2xl'
          : size === 'list'
            ? 'size-[46px] rounded-[14px] text-[17px]'
            : size === 'detail'
              ? 'size-[54px] rounded-2xl text-xl lg:size-16 lg:rounded-[20px] lg:text-2xl'
            : 'size-11 rounded-pill text-lg',
        TONES[tone],
      )}
    >
      {initialsOf(name, max)}
    </Avatar>
  )
}
