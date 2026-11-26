import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { safePhotoUrl, type PhotoKind } from '../../lib/photo'

interface AvatarProps {
  photoUrl: string | null | undefined
  kind: PhotoKind
  /** Classes de l'avatar d'initiales existant (taille, forme, couleurs) : l'image prend exactement la même place. */
  className: string
  /** Initiales affichées sans photo ou si l'image ne se charge pas. */
  children: ReactNode
  /** Texte alternatif ; vide par défaut (le nom est écrit à côté). */
  alt?: string
  /** false : image visible des lecteurs d'écran (aperçu du profil). */
  decorative?: boolean
}

/**
 * Avatar commun (décision 130) : photo d'intervenant en `object-cover`, logo d'établissement en `object-contain` sur
 * fond blanc ; initiales en repli (pas de photo, adresse non sûre, image en erreur). Aucune dimension ne change.
 */
export function Avatar({ photoUrl, kind, className, children, alt = '', decorative = true }: AvatarProps) {
  const url = safePhotoUrl(photoUrl)
  const [failed, setFailed] = useState<string | null>(null)
  if (url === null || failed === url) {
    return (
      <span aria-hidden={decorative || undefined} className={className}>
        {children}
      </span>
    )
  }
  return (
    <span aria-hidden={decorative || undefined} className={cn(className, 'overflow-hidden', kind === 'logo' && 'bg-white')}>
      <img
        src={url}
        alt={decorative ? '' : alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(url)}
        className={cn('size-full', kind === 'photo' ? 'object-cover' : 'object-contain')}
      />
    </span>
  )
}
