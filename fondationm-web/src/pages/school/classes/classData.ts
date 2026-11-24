import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '../../../api/client'
import { errorFromException, errorMessage, invalidResponseError } from '../../../api/errors'
import { FETCH_PAGE_SIZE, fetchAllPages } from '../../../api/paging'
import { asRecord, integer, text } from '../../../api/wire'

/** Clé commune aux classes : la liste de F4 (`['school', 'classes']`) et celle de « Mon établissement ». */
export const CLASSES_PREFIX = ['school', 'classes'] as const
const MANAGED_KEY = [...CLASSES_PREFIX, 'etablissement'] as const

/** Classe de « Mon établissement » (W5-E2) : effectif déclaré et nombre d'élèves rattachés. */
export interface ManagedClass {
  id: string
  title: string
  fieldOfStudy: string
  /** Effectif déclaré (`studentCount`). */
  studentCount: number | null
  /** Élèves rattachés, avec un compte (`accountsCount`). */
  accountsCount: number
}

export function readManagedClass(value: unknown): ManagedClass | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  if (id === null) return null
  return {
    id,
    title: text(record, 'title') ?? 'Classe sans nom',
    fieldOfStudy: text(record, 'fieldOfStudy') ?? '',
    studentCount: integer(record, 'studentCount'),
    accountsCount: integer(record, 'accountsCount') ?? 0,
  }
}

export function useManagedClasses() {
  return useQuery({
    queryKey: MANAGED_KEY,
    queryFn: () =>
      fetchAllPages(
        (page) => unwrap(api.GET('/api/school/classes', { params: { query: { page, size: FETCH_PAGE_SIZE } } })),
        readManagedClass,
      ),
  })
}

export interface ClassChanges {
  title?: string
  fieldOfStudy?: string
  studentCount?: number
}

export function useUpdateClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: ClassChanges }) => {
      const updated = readManagedClass(await unwrap(api.PATCH('/api/school/classes/{id}', { params: { path: { id } }, body: changes })))
      if (updated === null) throw invalidResponseError()
      return updated
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLASSES_PREFIX }),
  })
}

export function useDeleteClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await unwrap(api.DELETE('/api/school/classes/{id}', { params: { path: { id } } }))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLASSES_PREFIX }),
  })
}

/** Codes non documentés dans le contrat, détectés dans le corps de la réponse (jamais par le statut seul). */
export const CLASS_ERRORS = {
  notEmpty: 'CLASS_NOT_EMPTY',
  hasMeetings: 'CLASS_HAS_MEETINGS',
  countTooLow: 'STUDENT_COUNT_TOO_LOW',
  full: 'CLASS_FULL',
} as const

export function errorCode(error: unknown): string {
  return errorFromException(error).code
}

/** Message d'une erreur sur une classe (suppression, modification). */
export function classErrorMessage(error: unknown, cls: Pick<ManagedClass, 'accountsCount'> | null): string {
  switch (errorCode(error)) {
    case CLASS_ERRORS.notEmpty:
      return 'Cette classe a encore des élèves. Déplacez-les ou retirez-les avant de la supprimer.'
    case CLASS_ERRORS.hasMeetings:
      return 'Cette classe a des rencontres. Elle ne peut pas être supprimée.'
    case CLASS_ERRORS.countTooLow:
      return `L'effectif déclaré ne peut pas être inférieur au nombre d'élèves déjà rattachés (${cls?.accountsCount ?? 0}).`
    default:
      return errorMessage(error)
  }
}
