import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '../../../api/client'
import { invalidResponseError } from '../../../api/errors'
import { FETCH_PAGE_SIZE, fetchAllPages } from '../../../api/paging'
import { asRecord, text } from '../../../api/wire'
import { generateAccessCode } from '../../../lib/accessCode'
import { studentEmail } from '../../../lib/studentLogin'
import { CLASSES_PREFIX, errorCode } from '../classes/classData'

export interface Student {
  id: string
  email: string
  firstName: string
  lastName: string
  classId: string | null
  createdAt: string | null
}

export function readStudent(value: unknown): Student | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  if (id === null) return null
  return {
    id,
    email: text(record, 'email') ?? '',
    firstName: text(record, 'firstName') ?? '',
    lastName: text(record, 'lastName') ?? '',
    classId: text(record, 'classId'),
    createdAt: text(record, 'createdAt'),
  }
}

/** Sous la clé des classes : ajouter, déplacer ou retirer un élève recharge aussi les compteurs des onglets. */
function studentsKey(classId: string) {
  return [...CLASSES_PREFIX, 'eleves', classId] as const
}

export function useClassStudents(classId: string | null) {
  return useQuery({
    queryKey: studentsKey(classId ?? ''),
    enabled: classId !== null,
    queryFn: () =>
      fetchAllPages(
        (page) =>
          unwrap(
            api.GET('/api/school/classes/{classId}/students', {
              params: { path: { classId: classId ?? '' }, query: { page, size: FETCH_PAGE_SIZE } },
            }),
          ),
        readStudent,
      ),
  })
}

/** Essais au plus quand l'adresse générée est déjà prise (.sor, .sor2 … .sor20). */
export const EMAIL_ATTEMPTS = 20
export const EMAIL_ALREADY_USED = 'EMAIL_ALREADY_USED'

export interface CreatedAccess {
  student: Student
  /** Code d'accès en clair : gardé en mémoire de la page seulement, jamais dans le cache des requêtes. */
  code: string
}

/**
 * Crée l'élève avec son compte (adresse générée, code d'accès en mot de passe temporaire). Volontairement hors de
 * TanStack Query : ni le code (variables) ni la réponse ne passent par le cache. Seul `EMAIL_ALREADY_USED`, lu
 * dans le corps de la réponse, déclenche un nouvel essai avec un numéro.
 */
export async function createStudentAccess(
  classId: string,
  firstName: string,
  lastName: string,
  suffix: string,
): Promise<CreatedAccess> {
  for (let attempt = 1; attempt <= EMAIL_ATTEMPTS; attempt += 1) {
    const code = generateAccessCode()
    try {
      const created = readStudent(
        await unwrap(
          api.POST('/api/school/classes/{classId}/students', {
            params: { path: { classId } },
            body: { firstName, lastName, email: studentEmail(firstName, lastName, suffix, attempt), password: code },
          }),
        ),
      )
      if (created === null) throw invalidResponseError()
      return { student: created, code }
    } catch (error) {
      if (errorCode(error) !== EMAIL_ALREADY_USED || attempt === EMAIL_ATTEMPTS) throw error
    }
  }
  throw invalidResponseError()
}

/** Nouvelle fiche : nouveau code, l'ancien et les sessions de l'élève cessent aussitôt de fonctionner (contrat). */
export async function renewStudentCode(studentId: string): Promise<string> {
  const code = generateAccessCode()
  await unwrap(api.POST('/api/school/students/{id}/password', { params: { path: { id: studentId } }, body: { newPassword: code } }))
  return code
}

export function useMoveStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, classId }: { id: string; classId: string }) => {
      await unwrap(api.PATCH('/api/school/students/{id}', { params: { path: { id } }, body: { classId } }))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLASSES_PREFIX }),
  })
}

export function useDeleteStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await unwrap(api.DELETE('/api/school/students/{id}', { params: { path: { id } } }))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLASSES_PREFIX }),
  })
}
