import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '../../api/client'
import type { components } from '../../api/schema'
import { meQuery } from '../../auth/hooks'
import { readPhotoSignature, type PhotoSignature } from './photoUpload'

type SpeakerPatch = components['schemas']['UpdateSpeakerProfileRequest']
type SchoolPatch = components['schemas']['UpdateSchoolProfileRequest']

/** Après une modification du profil : `/api/me` relu (carte utilisateur, profil, photo). */
function useRefreshMe() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: meQuery.queryKey })
}

export interface SpeakerProfileChange {
  /** Champs modifiés seulement (PATCH partiel). */
  patch: SpeakerPatch
  /** Compétences, si elles ont changé (PUT à part). */
  skills: string[] | null
}

/** PATCH /api/speaker/profile puis, si besoin, PUT /api/speaker/profile/skills (décision 132). */
export function useSaveSpeakerProfile() {
  const refresh = useRefreshMe()
  return useMutation({
    mutationFn: async ({ patch, skills }: SpeakerProfileChange) => {
      if (Object.keys(patch).length > 0) await unwrap(api.PATCH('/api/speaker/profile', { body: patch }))
      if (skills !== null) await unwrap(api.PUT('/api/speaker/profile/skills', { body: { skills } }))
    },
    onSettled: () => {
      void refresh()
    },
  })
}

export function useSaveSchoolProfile() {
  const refresh = useRefreshMe()
  return useMutation({
    mutationFn: async (patch: SchoolPatch) => {
      await unwrap(api.PATCH('/api/school/profile', { body: patch }))
    },
    onSettled: () => {
      void refresh()
    },
  })
}

export async function requestPhotoSignature(): Promise<PhotoSignature> {
  return readPhotoSignature(await unwrap(api.POST('/api/me/photo/signature')))
}

export async function savePhotoUrl(photoUrl: string): Promise<void> {
  await unwrap(api.PUT('/api/me/photo', { body: { photoUrl } }))
}

export async function deletePhoto(): Promise<void> {
  await unwrap(api.DELETE('/api/me/photo'))
}

export { useRefreshMe }
