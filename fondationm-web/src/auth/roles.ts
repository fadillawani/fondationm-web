import type { CurrentUser, Role } from './currentUser'

export const PATHS = {
  login: '/connexion',
  loginSpeaker: '/connexion/intervenant',
  loginFoundation: '/connexion/fondation',
  loginDonor: '/connexion/donateur',
  loginStudent: '/connexion/eleve',
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
  schoolMeetings: '/ecole/rencontres',
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

/** Page de connexion de chaque persona ; sans rôle connu, celle de l'établissement. */
export function loginPathFor(role: Role | null): string {
  switch (role) {
    case 'SPEAKER':
      return PATHS.loginSpeaker
    case 'FOUNDATION':
      return PATHS.loginFoundation
    case 'DONOR':
      return PATHS.loginDonor
    case 'STUDENT':
      return PATHS.loginStudent
    default:
      return PATHS.login
  }
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
  /** Libellé court de la navigation basse mobile (maquette). */
  short: string
  /** false : absente de la navigation basse mobile (maquette). */
  mobile?: boolean
}

export type NavBadge = 'pendingAccounts' | 'pendingRequests' | 'upcomingMeetings'

const FOUNDATION_NAV: NavItem[] = [
  { label: 'Tableau de bord', short: 'Accueil', icon: 'dashboard' },
  { label: 'Comptes à valider', short: 'Comptes', icon: 'accounts', to: PATHS.foundationAccounts, badge: 'pendingAccounts' },
  { label: 'Demandes de rencontre', short: 'Demandes', icon: 'requests' },
  { label: 'Rencontres', short: 'Rencontres', icon: 'meetings' },
  { label: "Retours d'expérience", short: 'Retours', icon: 'feedbacks' },
  // La navigation basse mobile de la maquette n'a que 5 entrées.
  { label: 'Requêtes donateurs', short: 'Requêtes', icon: 'donors', mobile: false },
]

const SPEAKER_NAV: NavItem[] = [
  { label: 'Mon agenda', short: 'Agenda', icon: 'meetings', to: PATHS.speakerAgenda },
  { label: 'Demandes reçues', short: 'Demandes', icon: 'requests', to: PATHS.speakerRequests, badge: 'pendingRequests' },
  { label: 'Mon impact', short: 'Mon impact', icon: 'feedbacks' },
]

const SCHOOL_NAV: NavItem[] = [
  { label: 'Intervenants', short: 'Intervenants', icon: 'accounts', to: PATHS.schoolSpeakers },
  { label: 'Mes rencontres', short: 'Rencontres', icon: 'meetings', to: PATHS.schoolMeetings, badge: 'upcomingMeetings' },
  { label: "Retours d'expérience", short: 'Retours', icon: 'feedbacks' },
  { label: 'Mon établissement', short: 'Établissement', icon: 'home' },
]

export function navItemsFor(role: Role): NavItem[] {
  if (role === 'FOUNDATION') return FOUNDATION_NAV
  if (role === 'SCHOOL') return SCHOOL_NAV
  if (role === 'SPEAKER') return SPEAKER_NAV
  return [{ to: ROLE_HOME[role], label: 'Accueil', short: 'Accueil', icon: 'home' }]
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
    // Maquette : nom et fonction de la personne, absents du contrat.
    return { name: 'Fondation M', initials: 1, detail: 'Équipe du programme' }
  }
  if (user.role === 'SCHOOL' && user.details?.kind === 'school') {
    // Maquette : nom du référent + « {Établissement} · {ville} » ; le référent est absent du contrat.
    return { name: user.displayName, initials: 2, detail: user.details.city || user.email }
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
