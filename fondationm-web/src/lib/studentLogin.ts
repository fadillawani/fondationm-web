/**
 * Connexion des élèves (maquette W5-E1 : « Identifiant », ex. « khadija.ba.sor »).
 *
 * Le backend n'accepte que l'e-mail (`LoginRequest.email`) et un compte élève est créé avec un e-mail.
 * Convention : un identifiant sans « @ » est converti en `{identifiant}@eleve.fondationm.sn` ; une saisie
 * qui contient « @ » est envoyée telle quelle. Le lot « Mon établissement » créera les comptes élèves avec
 * cette même adresse générée (identifiant lisible = partie avant le @).
 */
export const STUDENT_EMAIL_DOMAIN = 'eleve.fondationm.sn'

export function toStudentLoginEmail(identifier: string): string {
  const value = identifier.trim()
  return value.includes('@') ? value : `${value}@${STUDENT_EMAIL_DOMAIN}`
}

/** Identifiant lisible d'une adresse générée (partie avant le @). */
export function studentIdentifier(email: string): string {
  return email.split('@')[0] ?? email
}
