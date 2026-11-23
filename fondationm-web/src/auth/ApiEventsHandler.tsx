import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { onApiEvent } from '../api/events'
import { endSession, meQuery, type LoginRedirectState } from './hooks'
import { PATHS, destinationFor } from './roles'

export function ApiEventsHandler() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(
    () =>
      onApiEvent((event) => {
        if (event === 'unauthenticated') {
          endSession(queryClient)
          const state: LoginRedirectState = { sessionExpired: true }
          void navigate(PATHS.login, { replace: true, state })
          return
        }
        void queryClient
          .fetchQuery({ ...meQuery, staleTime: 0 })
          .then((user) => navigate(destinationFor(user), { replace: true }))
          .catch(() => undefined)
      }),
    [queryClient, navigate],
  )

  return null
}
