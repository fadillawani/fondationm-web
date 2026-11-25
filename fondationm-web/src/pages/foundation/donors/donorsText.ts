import { formatDayMonth, parseIso } from '../../../lib/dateTime'
import type { DonorRequest, DonorRequestStatus } from './donorsData'

/** Statuts de la maquette W3-requetes ; « En cours » n'existe pas dans le contrat (retiré). */
export const REQUEST_BADGE: Record<DonorRequestStatus, { label: string; className: string }> = {
  OPEN: { label: 'Nouvelle', className: 'bg-red text-white' },
  ANSWERED: { label: 'Traitée', className: 'bg-green text-white' },
}

const MONTH_SHORT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

/** « 12 nov » (liste, bulles). */
export function shortDate(iso: string | null): string {
  const date = parseIso(iso)
  return date ? MONTH_SHORT.format(date).replace('.', '') : '—'
}

/** Nouvelles d'abord, puis par date d'envoi décroissante. */
export function byNewestOpenFirst(a: DonorRequest, b: DonorRequest): number {
  if (a.status !== b.status) return a.status === 'OPEN' ? -1 : 1
  return (parseIso(b.createdAt)?.getTime() ?? 0) - (parseIso(a.createdAt)?.getTime() ?? 0)
}

export const RESPONSE_MAX = 2000
export const RESPONSE_REQUIRED = 'Écrivez votre réponse avant de l’envoyer.'

export function irreversibleNote(name: string): string {
  return `Votre réponse sera visible dans l’espace de ${name}. Vous ne pourrez plus la modifier.`
}

export function answeredNote(name: string): string {
  return `Requête traitée. La réponse est visible dans l’espace de ${name}.`
}

/** « Dernière consultation le 12 novembre 2026 » ou « Jamais consulté ». */
export function consultationLine(iso: string | null): string {
  const date = parseIso(iso)
  return date ? `Dernière consultation le ${formatDayMonth(date)} ${date.getFullYear()}` : 'Jamais consulté'
}

/**
 * Note de la fiche d'accès donateur (une seule constante) : le contrat ne dit pas si le donateur devra changer son
 * mot de passe à la première connexion (point ouvert) ; aucun e-mail n'est envoyé.
 */
export const DONOR_ACCESS_NOTE =
  'Remettez ce code en main propre ou par un canal sûr. Il ne sera plus affiché après votre départ de cette page.'

export const DONOR_PRINT_FOOTER =
  'Connexion : page « Espace donateur » de la Fondation M, avec cette adresse e-mail et ce code. Remise en main propre ou par un canal sûr.'

export const DONOR_PRINT_REMINDER = 'Imprimez la fiche avant de quitter cette page : le code ne sera plus affiché.'

export const DONOR_CREATE_HINT =
  'Un code d’accès temporaire sera créé. Aucun e-mail n’est envoyé : remettez-le vous-même au donateur.'

export const EMAIL_TAKEN = 'Cette adresse e-mail est déjà utilisée par un compte.'

export const RENEW_DONOR_WARNING = 'L’ancien code ne fonctionnera plus.'
