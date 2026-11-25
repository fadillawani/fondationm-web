export interface ParsedName {
  firstName: string
  lastName: string
}

/**
 * « Ajouter plusieurs élèves » (F6-Q1) : une personne par ligne. Séparateur : point-virgule, sinon tabulation
 * (collage depuis un tableur), sinon le premier espace (prénom = premier mot, nom = le reste). Les lignes vides
 * sont ignorées ; l'aperçu permet de corriger les prénoms composés avant la création.
 */
export function parseStudentLines(input: string): ParsedName[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const separator = line.includes(';') ? ';' : line.includes('\t') ? '\t' : null
      if (separator !== null) {
        const [first = '', ...rest] = line.split(separator)
        return { firstName: first.trim(), lastName: rest.join(' ').trim().replace(/\s+/g, ' ') }
      }
      const [first = '', ...rest] = line.split(/\s+/)
      return { firstName: first, lastName: rest.join(' ') }
    })
}
