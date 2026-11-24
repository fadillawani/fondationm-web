/** Initiales d'un nom (« Lycée des Tisserands » → « LD »). */
export function initialsOf(name: string, max = 2): string {
  const letters = name
    .trim()
    .split(/[\s'’-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('fr-FR'))
  return letters.slice(0, max).join('') || '?'
}
