/**
 * Code d'accès des élèves (« Fiche d'accès à remettre », W5-E2) : 8 caractères tirés de l'alphabet de la maquette,
 * sans caractères ambigus (ni 0, O, 1, I, L). Envoyé comme mot de passe temporaire, affiché une seule fois ;
 * il n'est jamais stocké, journalisé ni placé dans l'URL.
 */
export const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ACCESS_CODE_LENGTH = 8

/** Source d'aléa : `crypto.getRandomValues` par défaut (remplaçable dans les tests). */
export type RandomBytes = (buffer: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>

const defaultRandom: RandomBytes = (buffer) => crypto.getRandomValues(buffer)

/** Tirage par rejet : chaque caractère de l'alphabet a la même probabilité. */
export function generateAccessCode(random: RandomBytes = defaultRandom): string {
  const size = ACCESS_CODE_ALPHABET.length
  const limit = 256 - (256 % size)
  let code = ''
  while (code.length < ACCESS_CODE_LENGTH) {
    for (const byte of random(new Uint8Array(16))) {
      if (byte < limit && code.length < ACCESS_CODE_LENGTH) code += ACCESS_CODE_ALPHABET[byte % size]
    }
  }
  return code
}
