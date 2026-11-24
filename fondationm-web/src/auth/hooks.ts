import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { api, unwrap } from '../api/client'
import { invalidResponseError } from '../api/errors'
import type { components } from '../api/schema'
import { toCurrentUser, type CurrentUser } from './currentUser'
import { lastRole } from './lastRole'
import { PATHS, destinationFor, loginPathFor } from './roles'
import { tokenStorage } from './tokenStorage'

type Schemas = components['schemas']

export type LoginCredentials = Schemas['LoginRequest']
export type RegisterSchoolBody = Schemas['RegisterSchoolRequest']
export type RegisterSpeakerBody = Schemas['RegisterSpeakerRequest']
export type ChangePasswordBody = Schemas['ChangeOwnPasswordRequest']

export type Registration =
  | { kind: 'school'; body: RegisterSchoolBody }
  | { kind: 'speaker'; body: RegisterSpeakerBody }

export type LoginNotice = 'session-expired' | 'account-created'

export interface LoginRedirectState {
  notice: LoginNotice
}

export function readLoginNotice(state: unknown): LoginNotice | null {
  if (typeof state !== 'object' || state === null || !('notice' in state)) return null
  return state.notice === 'session-expired' || state.notice === 'account-created' ? state.notice : null
}

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: async (): Promise<CurrentUser> => {
    const user = toCurrentUser(await unwrap(api.GET('/api/me')))
    lastRole.set(user.role)
    return user
  },
  staleTime: 60_000,
})

export function useMe() {
  return useQuery(meQuery)
}

/**
 * Termine la session : le jeton est effacé tout de suite, les requêtes en cours sont annulées.
 * Le cache est vidé par RequireAuth quand l'espace connecté se démonte (voir routes/guards.tsx) :
 * le vider avant aurait fait relancer, sans jeton, les requêtes des pages encore affichées.
 */
export function endSession(queryClient: QueryClient): void {
  tokenStorage.clear()
  void queryClient.cancelQueries()
}

function storeToken(token: Schemas['TokenResponse']): void {
  if (!token.accessToken) throw invalidResponseError()
  tokenStorage.set(token.accessToken)
}

async function signIn(queryClient: QueryClient, credentials: LoginCredentials): Promise<CurrentUser> {
  tokenStorage.clear()
  queryClient.removeQueries()
  storeToken(await unwrap(api.POST('/api/auth/login', { body: credentials })))
  try {
    return await queryClient.fetchQuery(meQuery)
  } catch (error) {
    tokenStorage.clear()
    queryClient.removeQueries()
    throw error
  }
}

export function useLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => signIn(queryClient, credentials),
    onSuccess: (user) => {
      void navigate(destinationFor(user), { replace: true })
    },
  })
}

async function submitRegistration(registration: Registration): Promise<void> {
  if (registration.kind === 'school') {
    await unwrap(api.POST('/api/auth/register/school', { body: registration.body }))
  } else {
    await unwrap(api.POST('/api/auth/register/speaker', { body: registration.body }))
  }
}

export function useRegister() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (registration: Registration): Promise<CurrentUser | null> => {
      await submitRegistration(registration)
      const { email, password } = registration.body
      try {
        return await signIn(queryClient, { email, password })
      } catch {
        return null
      }
    },
    onSuccess: (user, registration) => {
      if (user === null) {
        const state: LoginRedirectState = { notice: 'account-created' }
        void navigate(registration.kind === 'speaker' ? PATHS.loginSpeaker : PATHS.login, { replace: true, state })
        return
      }
      void navigate(destinationFor(user), { replace: true })
    },
  })
}

export function useChangePassword() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (body: ChangePasswordBody): Promise<CurrentUser> => {
      storeToken(await unwrap(api.POST('/api/me/password', { body })))
      return queryClient.fetchQuery({ ...meQuery, staleTime: 0 })
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
    void navigate(loginPathFor(lastRole.get()), { replace: true })
  }, [queryClient, navigate])
}
