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
  speakerAgenda: '/intervenant/agenda',
  speakerRequests: '/intervenant/demandes',
  schoolSpeakers: '/ecole/intervenants',
} as const

/** Demande de rencontre auprès d'un intervenant. */
export function schoolRequestPath(speakerId: string): string {
  return `${PATHS.schoolSpeakers}/${encodeURIComponent(speakerId)}/demande`
}

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
  /** Pastille de compteur alimentée par la mise en page (voir nav/badges.ts). */
  badge?: NavBadge
}

export type NavBadge = 'pendingAccounts' | 'pendingRequests'

const FOUNDATION_NAV: NavItem[] = [
  { label: 'Tableau de bord', icon: 'dashboard' },
  { label: 'Comptes à valider', icon: 'accounts', to: PATHS.foundationAccounts, badge: 'pendingAccounts' },
  { label: 'Demandes de rencontre', icon: 'requests' },
  { label: 'Rencontres', icon: 'meetings' },
  { label: "Retours d'expérience", icon: 'feedbacks' },
  { label: 'Requêtes donateurs', icon: 'donors' },
]

const SPEAKER_NAV: NavItem[] = [
  { label: 'Mon agenda', icon: 'meetings', to: PATHS.speakerAgenda },
  { label: 'Demandes reçues', icon: 'requests', to: PATHS.speakerRequests, badge: 'pendingRequests' },
  { label: 'Mon impact', icon: 'feedbacks' },
]

const SCHOOL_NAV: NavItem[] = [
  { label: 'Intervenants', icon: 'accounts', to: PATHS.schoolSpeakers },
  { label: 'Mes rencontres', icon: 'meetings' },
  { label: "Retours d'expérience", icon: 'feedbacks' },
  { label: 'Mon établissement', icon: 'home' },
]

export function navItemsFor(role: Role): NavItem[] {
  if (role === 'FOUNDATION') return FOUNDATION_NAV
  if (role === 'SCHOOL') return SCHOOL_NAV
  if (role === 'SPEAKER') return SPEAKER_NAV
  return [{ to: ROLE_HOME[role], label: 'Accueil', icon: 'home' }]
}

/** Sous-titre du logo dans la barre latérale. */
export const ROLE_TAGLINE: Partial<Record<Role, string>> = {
  FOUNDATION: 'Pilotage du programme',
  SPEAKER: 'Espace intervenant',
  SCHOOL: 'Espace établissement',
  DONOR: 'Espace mécène',
}

export interface AccountCard {
  name: string
  /** Nombre d'initiales affichées. */
  initials: number
  detail: string
}

/** Carte utilisateur du bas de la barre latérale. */
export function accountCard(user: CurrentUser): AccountCard {
  if (user.role === 'FOUNDATION') {
    // La Fondation n'a pas de profil (profile: null).
    return { name: 'Fondation M', initials: 1, detail: user.email }
  }
  if (user.role === 'SCHOOL' && user.details?.kind === 'school') {
    // Le nom du référent n'existe pas dans le contrat : initiales et nom de l'établissement.
    const detail = ['Établissement', user.details.city].filter(Boolean).join(' · ')
    return { name: user.displayName, initials: 2, detail }
  }
  if (user.role === 'SPEAKER' && user.details?.kind === 'speaker') {
    const detail = [user.details.jobTitle, user.details.city].filter(Boolean).join(' · ')
    return { name: user.displayName, initials: 2, detail: detail || user.email }
  }
  return { name: user.displayName, initials: 1, detail: user.email }
}

export function destinationFor(user: CurrentUser): string {
  if (user.status === 'PENDING') return PATHS.pending
  if (user.status === 'REJECTED') return PATHS.rejected
  if (user.mustChangePassword) return PATHS.mustChangePassword
  return ROLE_HOME[user.role]
}
