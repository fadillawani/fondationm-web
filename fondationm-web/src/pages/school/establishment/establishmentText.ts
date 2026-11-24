import { ERROR_CODES, errorMessage } from '../../../api/errors'
import { CLASS_ERRORS, errorCode, type ManagedClass } from '../classes/classData'

/**
 * Note de la fiche d'accès (F6-Q3) : le contrat ne dit pas si un élève créé par l'école doit changer son mot de
 * passe à la première connexion (`mustChangePassword`). Tant que ce n'est pas vérifié sur un vrai compte, la note
 * ne promet rien. Une fois vérifié, remplacer par : « Remettez cette fiche en main propre. L'élève choisira son
 * mot de passe à la première connexion. »
 */
export const ACCESS_NOTE = 'Remettez cette fiche en main propre. Ce code ne sera plus affiché après votre départ de cette page.'

export const PRINT_REMINDER = 'Imprimez les fiches avant de quitter cette page : les codes ne seront plus affichés.'

export const EMPTY_CLASS = "Aucun élève rattaché pour l'instant. Ajoutez le premier ci-dessous."

export const NO_CLASS = "Vous n'avez pas encore de classe. Créez la première."

export const NAME_REQUIRED = "Indiquez le prénom et le nom de l'élève."

export const RENEW_WARNING = "L'ancien code ne fonctionnera plus et l'élève sera déconnecté."

export function studentsLine(count: number): string {
  return count > 1 ? `${count} élèves rattachés` : `${count} élève rattaché`
}

/** « {n} élèves rattachés · effectif déclaré {studentCount} » (F6-Q4). */
export function classSummary(cls: ManagedClass, count: number): string {
  if (count === 0) return EMPTY_CLASS
  return cls.studentCount === null ? studentsLine(count) : `${studentsLine(count)} · effectif déclaré ${cls.studentCount}`
}

/** Places restantes avant l'effectif déclaré (null : effectif inconnu). */
export function remainingPlaces(cls: ManagedClass, count: number): number | null {
  return cls.studentCount === null ? null : Math.max(0, cls.studentCount - count)
}

export function placesLine(places: number): string {
  return places > 1 ? `${places} places restantes` : `${places} place restante`
}

/** Erreur d'ajout ou de déplacement d'un élève ; `full` indique qu'il faut proposer « Modifier la classe ». */
export function studentErrorMessage(error: unknown, target: ManagedClass | null): { message: string; full: boolean } {
  const code = errorCode(error)
  if (code === CLASS_ERRORS.full) {
    return {
      message: `Cette classe est complète (effectif déclaré ${target?.studentCount ?? '?'}). Augmentez l'effectif pour ajouter un élève.`,
      full: true,
    }
  }
  if (code === ERROR_CODES.RATE_LIMITED) return { message: 'Trop de demandes, réessayez dans un instant.', full: false }
  return { message: errorMessage(error), full: false }
}
