import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { api, unwrap } from '../api/client'
import { invalidResponseError } from '../api/errors'
import type { components } from '../api/schema'
import { toCurrentUser, type CurrentUser } from './currentUser'
import { PATHS, destinationFor } from './roles'
import { tokenStorage } from './tokenStorage'

export type LoginCredentials = components['schemas']['LoginRequest']

export interface LoginRedirectState {
  sessionExpired: true
}

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: async (): Promise<CurrentUser> => toCurrentUser(await unwrap(api.GET('/api/me'))),
  staleTime: 60_000,
})

export function useMe() {
  return useQuery(meQuery)
}

export function endSession(queryClient: QueryClient): void {
  tokenStorage.clear()
  queryClient.clear()
}

export function useLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<CurrentUser> => {
      tokenStorage.clear()
      queryClient.removeQueries()
      const token = await unwrap(api.POST('/api/auth/login', { body: credentials }))
      if (!token.accessToken) throw invalidResponseError()
      tokenStorage.set(token.accessToken)
      try {
        return await queryClient.fetchQuery(meQuery)
      } catch (error) {
        tokenStorage.clear()
        queryClient.removeQueries()
        throw error
      }
    },
    onSuccess: (user) => {
      void navigate(destinationFor(user), { replace: true })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useCallback(() => {
    endSession(queryClient)
    void navigate(PATHS.login, { replace: true })
  }, [queryClient, navigate])
}
