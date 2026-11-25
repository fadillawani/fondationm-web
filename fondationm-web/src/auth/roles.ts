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
  foundationDashboard: '/fondation/tableau-de-bord',
  foundationAccounts: '/fondation/comptes',
  foundationDonorRequests: '/fondation/requetes',
  foundationRequests: '/fondation/demandes',
  foundationMeetings: '/fondation/rencontres',
  foundationFeedbacks: '/fondation/retours',
  speakerAgenda: '/intervenant/agenda',
  speakerRequests: '/intervenant/demandes',
  speakerImpact: '/intervenant/impact',
  speakerFeedbacks: '/intervenant/retours',
  schoolSpeakers: '/ecole/intervenants',
  schoolMeetings: '/ecole/rencontres',
  schoolEstablishment: '/ecole/etablissement',
  schoolFeedbacks: '/ecole/retours',
  donorImpact: '/donateur/impact',
  donorRequests: '/donateur/requetes',
} as const

/** Nouvelle requête du donateur, objet prérempli (complément, question sur un retour). */
export function donorNewRequestPath(subject: string): string {
  return `${PATHS.donorRequests}?vue=nouvelle&objet=${encodeURIComponent(subject)}`
}

/** Formulaire de retour d'expérience d'une rencontre (école ou intervenant). */
export function feedbackFormPath(role: 'school' | 'speaker', meetingId: string): string {
  return `${role === 'school' ? PATHS.schoolFeedbacks : PATHS.speakerFeedbacks}/${encodeURIComponent(meetingId)}`
}

/** Retours d'une rencontre dans l'espace Fondation (onglet « Tous » : la rencontre y est toujours). */
export function foundationFeedbackPath(meetingId: string): string {
  return `${PATHS.foundationFeedbacks}?onglet=tous&rencontre=${encodeURIComponent(meetingId)}`
}

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

export type NavIcon = 'home' | 'school' | 'dashboard' | 'accounts' | 'requests' | 'meetings' | 'feedbacks' | 'donors'

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

export type NavBadge = 'pendingAccounts' | 'pendingRequests' | 'upcomingMeetings' | 'awaitingFoundation' | 'meetingsToMark' | 'openDonorRequests' | 'feedbacksToValidate' | 'myOpenRequests'

const FOUNDATION_NAV: NavItem[] = [
  { label: 'Tableau de bord', short: 'Accueil', icon: 'dashboard', to: PATHS.foundationDashboard },
  { label: 'Comptes à valider', short: 'Comptes', icon: 'accounts', to: PATHS.foundationAccounts, badge: 'pendingAccounts' },
  { label: 'Demandes de rencontre', short: 'Demandes', icon: 'requests', to: PATHS.foundationRequests, badge: 'awaitingFoundation' },
  { label: 'Rencontres', short: 'Rencontres', icon: 'meetings', to: PATHS.foundationMeetings, badge: 'meetingsToMark' },
  { label: "Retours d'expérience", short: 'Retours', icon: 'feedbacks', to: PATHS.foundationFeedbacks, badge: 'feedbacksToValidate' },
  // La navigation basse mobile de la maquette n'a que 5 entrées.
  { label: 'Requêtes donateurs', short: 'Requêtes', icon: 'donors', mobile: false, to: PATHS.foundationDonorRequests, badge: 'openDonorRequests' },
]

const SPEAKER_NAV: NavItem[] = [
  { label: 'Mon agenda', short: 'Agenda', icon: 'meetings', to: PATHS.speakerAgenda },
  { label: 'Demandes reçues', short: 'Demandes', icon: 'requests', to: PATHS.speakerRequests, badge: 'pendingRequests' },
  { label: 'Mon impact', short: 'Mon impact', icon: 'feedbacks', to: PATHS.speakerImpact },
]

const SCHOOL_NAV: NavItem[] = [
  { label: 'Intervenants', short: 'Intervenants', icon: 'accounts', to: PATHS.schoolSpeakers },
  { label: 'Mes rencontres', short: 'Rencontres', icon: 'meetings', to: PATHS.schoolMeetings, badge: 'upcomingMeetings' },
  { label: "Retours d'expérience", short: 'Retours', icon: 'feedbacks', to: PATHS.schoolFeedbacks },
  { label: 'Mon établissement', short: 'Établissement', icon: 'school', to: PATHS.schoolEstablishment },
]

/** Une seule entrée : pas de navigation basse sur mobile (décision 112) ; l'avatar ouvre le menu du compte. */
const STUDENT_NAV: NavItem[] = [{ label: 'Les rencontres de ma classe', short: 'Rencontres', icon: 'meetings', to: ROLE_HOME.STUDENT, mobile: false }]

const DONOR_NAV: NavItem[] = [
  { label: "Rapport d'impact", short: 'Impact', icon: 'dashboard', to: PATHS.donorImpact },
  { label: 'Mes requêtes', short: 'Requêtes', icon: 'requests', to: PATHS.donorRequests, badge: 'myOpenRequests' },
]

export function navItemsFor(role: Role): NavItem[] {
  if (role === 'FOUNDATION') return FOUNDATION_NAV
  if (role === 'SCHOOL') return SCHOOL_NAV
  if (role === 'SPEAKER') return SPEAKER_NAV
  if (role === 'DONOR') return DONOR_NAV
  if (role === 'STUDENT') return STUDENT_NAV
  return [{ to: ROLE_HOME[role], label: 'Accueil', short: 'Accueil', icon: 'home' }]
}

/** Sous-titre du logo dans la barre latérale. */
export const ROLE_TAGLINE: Partial<Record<Role, string>> = {
  FOUNDATION: 'Pilotage du programme',
  SPEAKER: 'Espace intervenant',
  SCHOOL: 'Espace établissement',
  DONOR: 'Espace donateur',
  STUDENT: 'Espace élève',
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
  if (user.role === 'STUDENT') {
    // Maquette : « Terminale S2 · Lycée de Sor » ; aucun établissement dans le profil, l'e-mail généré n'est pas montré.
    const classTitle = user.details?.kind === 'student' ? user.details.classTitle : ''
    return { name: user.displayName, initials: 2, detail: classTitle || 'Élève' }
  }
  return { name: user.displayName, initials: 1, detail: user.email }
}

export function destinationFor(user: CurrentUser): string {
  if (user.status === 'PENDING') return PATHS.pending
  if (user.status === 'REJECTED') return PATHS.rejected
  if (user.mustChangePassword) return PATHS.mustChangePassword
  return ROLE_HOME[user.role]
}
