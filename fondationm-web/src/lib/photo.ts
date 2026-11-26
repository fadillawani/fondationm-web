import { asRecord, text, type WireRecord } from '../api/wire'

/** Seules les images servies par Cloudinary sont affichées (contrat de `PUT /api/me/photo`, décision 130). */
const PHOTO_ORIGIN = 'https://res.cloudinary.com/'

export function safePhotoUrl(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.startsWith(PHOTO_ORIGIN) && value.length <= 300 ? value : null
}

/** `photoUrl` lu de façon défensive : facultatif partout (schémas fusionnés), `null` si absent ou non sûr. */
export function readPhotoUrl(record: WireRecord | null | undefined): string | null {
  return record ? safePhotoUrl(text(record, 'photoUrl')) : null
}

/** Même lecture pour un objet imbriqué (`speaker`, `school`). */
export function nestedPhotoUrl(record: WireRecord, key: string): string | null {
  return readPhotoUrl(asRecord(record[key]))
}

/** Photo d'intervenant (recadrée) ou logo d'établissement (jamais coupé). */
export type PhotoKind = 'photo' | 'logo'
