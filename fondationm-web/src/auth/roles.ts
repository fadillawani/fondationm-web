import type { CurrentUser, Role } from './currentUser'

export const PATHS = {
  login: '/connexion',
  register: '/inscription',
  registerSchool: '/inscription/ecole',
  registerSpeaker: '/inscription/intervenant',
  pending: '/compte-en-attente',
  rejected: '/compte-refuse',
  mustChangePassword: '/mot-de-passe-obligatoire',
  foundationAccounts: '/fondation/comptes',
} as const

export const ROLE_HOME: Record<Role, string> = {
  SCHOOL: '/ecole',
  SPEAKER: '/intervenant',
  FOUNDATION: '/fondation',
  DONOR: '/donateur',
  STUDENT: '/eleve',
}

export const ROLE_LABEL: Record<Role, string> = {
  SCHOOL: 'Établissement',
  SPEAKER: 'Intervenant',
  FOUNDATION: 'Fondation',
  DONOR: 'Donateur',
  STUDENT: 'Élève',
}

export type NavIcon = 'home' | 'dashboard' | 'accounts' | 'requests' | 'meetings' | 'feedbacks' | 'donors'

export interface NavItem {
  label: string
  icon: NavIcon
  /** Absent : entrée affichée mais désactivée (« Bientôt »). */
  to?: string
  /** Pastille de compteur alimentée par la mise en page. */
  badge?: 'pendingAccounts'
}

const FOUNDATION_NAV: NavItem[] = [
  { label: 'Tableau de bord', icon: 'dashboard' },
  { label: 'Comptes à valider', icon: 'accounts', to: PATHS.foundationAccounts, badge: 'pendingAccounts' },
  { label: 'Demandes de rencontre', icon: 'requests' },
  { label: 'Rencontres', icon: 'meetings' },
  { label: "Retours d'expérience", icon: 'feedbacks' },
  { label: 'Requêtes donateurs', icon: 'donors' },
]

export function navItemsFor(role: Role): NavItem[] {
  if (role === 'FOUNDATION') return FOUNDATION_NAV
  return [{ to: ROLE_HOME[role], label: 'Accueil', icon: 'home' }]
}

/** Sous-titre du logo dans la barre latérale. */
export const ROLE_TAGLINE: Partial<Record<Role, string>> = {
  FOUNDATION: 'Pilotage du programme',
}

/** Nom de la carte utilisateur : la Fondation n'a pas de profil (profile: null). */
export function accountCardName(user: CurrentUser): string {
  return user.role === 'FOUNDATION' ? 'Fondation M' : user.displayName
}

export function destinationFor(user: CurrentUser): string {
  if (user.status === 'PENDING') return PATHS.pending
  if (user.status === 'REJECTED') return PATHS.rejected
  if (user.mustChangePassword) return PATHS.mustChangePassword
  return ROLE_HOME[user.role]
}
