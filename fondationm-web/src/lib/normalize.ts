/** Comparaison de noms sans majuscules ni accents (villes, pays). */
export function normalizeName(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLocaleLowerCase('fr-FR')
}

export function sameName(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b)
}
