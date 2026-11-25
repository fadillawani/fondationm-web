import { studentIdentifier } from '../../../lib/studentLogin'
import type { Student } from './establishmentData'

export function studentName(student: Pick<Student, 'firstName' | 'lastName'>): string {
  return `${student.firstName} ${student.lastName}`.trim() || 'Élève'
}

/** Fiche produite pendant la visite : le code n'existe qu'ici, dans l'état de la page. */
export interface AccessSheet {
  studentId: string
  name: string
  login: string
  code: string
  classId: string
  printed: boolean
}

export function sheetFor(student: Student, code: string, classId: string): AccessSheet {
  return { studentId: student.id, name: studentName(student), login: studentIdentifier(student.email), code, classId, printed: false }
}
