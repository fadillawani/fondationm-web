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

/** Mots génériques retirés du nom de l'établissement avant de choisir le suffixe (F6-Q2). */
const GENERIC_WORDS = new Set([
  'lycee', 'college', 'ecole', 'institut', 'complexe', 'scolaire', 'cours', 'prive', 'privee',
  'de', 'du', 'des', 'la', 'le', 'les', 'l', 'd',
])

/** Minuscules a–z seulement (accents retirés). */
function slug(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z]/g, '')
}

/**
 * Suffixe des adresses élèves : premier mot distinctif du nom de l'établissement (« Lycée de Sor » → « sor »),
 * sinon les 6 premiers caractères a–z / 0–9 de l'identifiant de l'école. Les adresses déjà créées ne changent
 * pas si l'établissement change de nom.
 */
export function schoolSuffix(schoolName: string, schoolId: string): string {
  const words = schoolName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word !== '' && !GENERIC_WORDS.has(word))
  const word = words[0]
  if (word !== undefined) return word
  return schoolId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'ecole'
}

/** Longueur maximale de la partie avant le « @ » (RFC 5321). */
const LOCAL_PART_MAX = 64

/**
 * Adresse générée d'un élève : `{prénom}.{nom}.{suffixe}{n}@eleve.fondationm.sn` (n absent au premier essai,
 * puis 2, 3… en cas d'adresse déjà utilisée).
 */
export function studentEmail(firstName: string, lastName: string, suffix: string, attempt = 1): string {
  const number = attempt > 1 ? String(attempt) : ''
  const tail = `.${suffix}${number}`
  const head = [slug(firstName), slug(lastName)].filter(Boolean).join('.') || 'eleve'
  return `${head.slice(0, LOCAL_PART_MAX - tail.length)}${tail}@${STUDENT_EMAIL_DOMAIN}`
}
