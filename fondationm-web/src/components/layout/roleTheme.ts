import type { Role } from '../../auth/currentUser'

/**
 * Couleurs de la barre latérale et de la navigation basse, par persona (maquette « Marché »).
 * Seul endroit où ces couleurs sont définies. Contrastes : voir docs/etat-frontend.md (décision 36).
 */
export interface RoleTheme {
  /** Fond et texte de la barre latérale et de la navigation basse. */
  surface: string
  /** Survol d'un lien inactif. */
  hover: string
  /** Lien actif. */
  active: string
  /** Pastille de compteur. */
  badge: string
  /** Pastille « Bientôt ». */
  soon: string
  /** Carte utilisateur (fond, nom, détail). */
  card: string
  cardName: string
  cardDetail: string
  /** Avatar de la carte utilisateur. */
  avatar: string
  /** Contour de focus. */
  focus: string
}

const DARK_TEXT = {
  hover: 'hover:bg-ink/10',
  soon: 'bg-ink/10',
  focus: 'focus-visible:outline-ink',
}

const LIGHT_TEXT = {
  hover: 'hover:bg-white/10',
  soon: 'bg-white/15',
  focus: 'focus-visible:outline-cream',
}

export const ROLE_THEME: Record<Role, RoleTheme> = {
  SCHOOL: {
    ...LIGHT_TEXT,
    surface: 'bg-indigo text-cream',
    active: 'bg-terra text-white',
    badge: 'bg-orange text-ink',
    card: 'bg-ink',
    cardName: 'text-white',
    cardDetail: 'text-cream',
    avatar: 'bg-cream text-indigo',
  },
  SPEAKER: {
    ...DARK_TEXT,
    surface: 'bg-orange text-ink',
    active: 'bg-ink text-cream',
    badge: 'bg-white text-ink',
    card: 'bg-ink',
    cardName: 'text-white',
    cardDetail: 'text-cream',
    avatar: 'bg-orange text-ink',
  },
  FOUNDATION: {
    ...LIGHT_TEXT,
    surface: 'bg-terra text-white',
    active: 'bg-ink text-cream',
    badge: 'bg-cream text-ink',
    card: 'bg-terra-dark',
    cardName: 'text-white',
    cardDetail: 'text-cream',
    avatar: 'bg-cream text-terra',
  },
  DONOR: {
    ...LIGHT_TEXT,
    surface: 'bg-green text-white',
    active: 'bg-ink text-cream',
    badge: 'bg-cream text-ink',
    card: 'bg-[#3B5221]',
    cardName: 'text-white',
    cardDetail: 'text-cream',
    avatar: 'bg-cream text-green',
  },
  STUDENT: {
    ...DARK_TEXT,
    surface: 'bg-yellow text-ink',
    active: 'bg-ink text-cream',
    badge: 'bg-white text-ink',
    card: 'bg-ink',
    cardName: 'text-white',
    cardDetail: 'text-cream',
    avatar: 'bg-cream text-ink',
  },
}
