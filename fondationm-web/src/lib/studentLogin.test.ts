import { describe, expect, it } from 'vitest'
import { STUDENT_EMAIL_DOMAIN, schoolSuffix, studentEmail, studentIdentifier, toStudentLoginEmail } from './studentLogin'

describe('toStudentLoginEmail', () => {
  it('complète un identifiant sans « @ » avec le domaine des élèves', () => {
    expect(toStudentLoginEmail('khadija.ba.sor')).toBe('khadija.ba.sor@eleve.fondationm.sn')
    expect(STUDENT_EMAIL_DOMAIN).toBe('eleve.fondationm.sn')
  })

  it('retire les espaces autour de l’identifiant', () => {
    expect(toStudentLoginEmail('  khadija.ba.sor ')).toBe('khadija.ba.sor@eleve.fondationm.sn')
  })

  it('envoie telle quelle une saisie qui contient « @ »', () => {
    expect(toStudentLoginEmail('eleve@exemple.sn')).toBe('eleve@exemple.sn')
  })

  it('retrouve l’identifiant lisible d’une adresse générée', () => {
    expect(studentIdentifier('khadija.ba.sor@eleve.fondationm.sn')).toBe('khadija.ba.sor')
  })
})

describe('schoolSuffix', () => {
  it('prend le premier mot distinctif du nom de l’établissement', () => {
    expect(schoolSuffix('Lycée de Sor', 'x')).toBe('sor')
    expect(schoolSuffix("Collège d'Enseignement Moyen Ndiaye", 'x')).toBe('enseignement')
    expect(schoolSuffix('Complexe scolaire privé Les Pédagogues', 'x')).toBe('pedagogues')
    expect(schoolSuffix("École de l'Excellence", 'x')).toBe('excellence')
  })

  it('se replie sur les 6 premiers caractères de l’identifiant de l’école', () => {
    expect(schoolSuffix('Lycée de la', '7F1C2A9E-0000-4000')).toBe('7f1c2a')
  })
})

describe('studentEmail', () => {
  it('construit l’adresse sans accents, numérotée à partir du deuxième essai', () => {
    expect(studentEmail('Ndèye', 'Mbaye', 'sor')).toBe('ndeye.mbaye.sor@eleve.fondationm.sn')
    expect(studentEmail('Khadija', 'Ba', 'sor', 2)).toBe('khadija.ba.sor2@eleve.fondationm.sn')
    expect(studentIdentifier(studentEmail('Jean-Paul', "N'Diaye", 'sor'))).toBe('jeanpaul.ndiaye.sor')
  })

  it('limite la partie avant le « @ » à 64 caractères', () => {
    const email = studentEmail('a'.repeat(50), 'b'.repeat(50), 'sor', 12)
    expect(studentIdentifier(email)).toHaveLength(64)
    expect(studentIdentifier(email).endsWith('.sor12')).toBe(true)
  })
})
