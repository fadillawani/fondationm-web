import type { Role } from '../../auth/currentUser'

/**
 * Couleurs de la barre latérale par persona (maquette « Marché », docs/maquette).
 * Seul endroit où ces couleurs sont définies. La navigation basse mobile est blanche pour toutes les
 * personas (maquette), elle n'utilise pas cette table. Contrastes : docs/etat-frontend.md (décision 36).
 */
export interface RoleTheme {
  /** Fond et texte de la barre latérale. */
  surface: string
  /** Logo « FondationM ». */
  logo: string
  /** Sous-titre du logo (12 px, majuscules) : couleur et graisse. */
  tagline: string
  /** Lien inactif (couleur du texte) et son survol. */
  link: string
  /** Lien actif. */
  active: string
  /** Pastille de compteur. */
  badge: string
  /** Pastille « Bientôt ». */
  soon: string
  /** Carte utilisateur : fond. */
  card: string
  /** Avatar (initiales) de la carte et de l'en-tête mobile. */
  avatar: string
  /** Contour de focus dans la barre latérale. */
  focus: string
}

export const ROLE_THEME: Record<Role, RoleTheme> = {
  SCHOOL: {
    surface: 'bg-indigo text-cream',
    logo: 'text-cream',
    tagline: 'font-extrabold text-canvas',
    link: 'text-canvas hover:bg-white/10',
    active: 'bg-terra text-white',
    badge: 'bg-orange text-ink',
    soon: 'bg-white/15',
    card: 'bg-ink',
    avatar: 'bg-yellow text-ink',
    focus: 'focus-visible:outline-cream',
  },
  SPEAKER: {
    surface: 'bg-orange text-ink',
    logo: 'text-ink',
    tagline: 'font-black text-ink',
    link: 'text-ink hover:bg-ink/10',
    active: 'bg-ink text-cream',
    badge: 'bg-white text-ink',
    soon: 'bg-ink/10',
    card: 'bg-ink',
    avatar: 'bg-indigo text-cream',
    focus: 'focus-visible:outline-ink',
  },
  FOUNDATION: {
    surface: 'bg-terra text-white',
    logo: 'text-cream',
    tagline: 'font-black text-white',
    link: 'text-white hover:bg-white/10',
    active: 'bg-ink text-cream',
    badge: 'bg-cream text-ink',
    soon: 'bg-white/15',
    card: 'bg-terra-dark',
    avatar: 'bg-cream text-terra',
    focus: 'focus-visible:outline-cream',
  },
  DONOR: {
    surface: 'bg-green text-white',
    logo: 'text-cream',
    tagline: 'font-black text-white',
    link: 'text-white hover:bg-white/10',
    active: 'bg-ink text-cream',
    badge: 'bg-cream text-ink',
    soon: 'bg-white/15',
    card: 'bg-[#3B5221]',
    avatar: 'bg-cream text-green',
    focus: 'focus-visible:outline-cream',
  },
  STUDENT: {
    surface: 'bg-yellow text-ink',
    logo: 'text-ink',
    tagline: 'font-black text-ink',
    link: 'text-ink hover:bg-ink/10',
    active: 'bg-ink text-cream',
    badge: 'bg-white text-ink',
    soon: 'bg-ink/10',
    card: 'bg-ink',
    avatar: 'bg-cream text-ink',
    focus: 'focus-visible:outline-ink',
  },
}
