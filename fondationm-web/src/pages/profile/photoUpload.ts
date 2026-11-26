import { invalidResponseError } from '../../api/errors'
import { asRecord, integer, text } from '../../api/wire'

/** 5 Mo, contrôlé avant tout appel (décision 129). */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024

export type ImageFormat = 'jpg' | 'png' | 'webp'

const MIME: Record<string, ImageFormat> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const EXTENSIONS: Record<ImageFormat, readonly string[]> = { jpg: ['jpg', 'jpeg'], png: ['png'], webp: ['webp'] }

export const FILE_TYPE_ERROR = 'Choisissez une image JPG, PNG ou WebP.'
export const FILE_SIZE_ERROR = 'L’image dépasse 5 Mo.'

function formatOfBytes(bytes: Uint8Array): ImageFormat | null {
  const at = (index: number) => bytes[index] ?? -1
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'jpg'
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => at(index) === value)) return 'png'
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to))
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp'
  return null
}

async function headBytes(file: Blob): Promise<Uint8Array> {
  const head = file.slice(0, 12)
  const buffer = typeof head.arrayBuffer === 'function' ? await head.arrayBuffer() : await new Response(head).arrayBuffer()
  return new Uint8Array(buffer)
}

export type FileCheck = { ok: true; format: ImageFormat } | { ok: false; message: string }

/** Type MIME, extension et premiers octets doivent désigner le même format ; 5 Mo au plus. */
export async function checkImageFile(file: File): Promise<FileCheck> {
  const format = MIME[file.type]
  const extension = file.name.split('.').at(-1)?.toLowerCase() ?? ''
  if (format === undefined || !EXTENSIONS[format].includes(extension)) return { ok: false, message: FILE_TYPE_ERROR }
  if (file.size > PHOTO_MAX_BYTES) return { ok: false, message: FILE_SIZE_ERROR }
  if (formatOfBytes(await headBytes(file)) !== format) return { ok: false, message: FILE_TYPE_ERROR }
  return { ok: true, format }
}

/** Réponse de `POST /api/me/photo/signature`, lue de façon défensive. */
export interface PhotoSignature {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  publicId: string
  assetFolder: string | null
  overwrite: boolean | null
  invalidate: boolean | null
  allowedFormats: string | null
  transformation: string | null
  maxFileSize: number | null
}

const bool = (value: unknown) => (typeof value === 'boolean' ? value : null)

export function readPhotoSignature(value: unknown): PhotoSignature {
  const record = asRecord(value)
  const timestamp = record && integer(record, 'timestamp')
  const cloudName = record && text(record, 'cloudName')
  const apiKey = record && text(record, 'apiKey')
  const signature = record && text(record, 'signature')
  const publicId = record && text(record, 'publicId')
  if (record === null || timestamp === null || !cloudName || !apiKey || !signature || !publicId) throw invalidResponseError()
  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    publicId,
    assetFolder: text(record, 'assetFolder'),
    overwrite: bool(record.overwrite),
    invalidate: bool(record.invalidate),
    allowedFormats: text(record, 'allowedFormats'),
    transformation: text(record, 'transformation'),
    maxFileSize: integer(record, 'maxFileSize'),
  }
}

/** Le fichier respecte-t-il aussi les formats et la taille annoncés par la signature ? */
export function fitsSignature(format: ImageFormat, size: number, signature: PhotoSignature): FileCheck {
  const allowed = signature.allowedFormats?.split(',').map((value) => value.trim().toLowerCase())
  if (allowed !== undefined && !allowed.some((value) => EXTENSIONS[format].includes(value))) return { ok: false, message: FILE_TYPE_ERROR }
  if (signature.maxFileSize !== null && size > signature.maxFileSize) return { ok: false, message: FILE_SIZE_ERROR }
  return { ok: true, format }
}

export function cloudinaryUploadUrl(signature: PhotoSignature): string {
  return `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`
}

/**
 * Corps de l'envoi : exactement les paramètres signés, avec leurs valeurs (booléens en « true » / « false ») ; un
 * paramètre absent de la réponse n'est pas envoyé. Ni `resource_type` ni `cloud_name` (décision 131).
 */
export function uploadForm(file: Blob, signature: PhotoSignature): FormData {
  const form = new FormData()
  form.append('file', file)
  form.append('api_key', signature.apiKey)
  form.append('timestamp', String(signature.timestamp))
  form.append('signature', signature.signature)
  form.append('public_id', signature.publicId)
  if (signature.assetFolder !== null) form.append('asset_folder', signature.assetFolder)
  if (signature.overwrite !== null) form.append('overwrite', String(signature.overwrite))
  if (signature.invalidate !== null) form.append('invalidate', String(signature.invalidate))
  if (signature.allowedFormats !== null) form.append('allowed_formats', signature.allowedFormats)
  if (signature.transformation !== null) form.append('transformation', signature.transformation)
  return form
}

export type UploadFailure = 'expired' | 'rejected' | 'network' | 'aborted'

export class PhotoUploadError extends Error {
  readonly kind: UploadFailure
  constructor(kind: UploadFailure) {
    super(kind)
    this.name = 'PhotoUploadError'
    this.kind = kind
  }
}

function cloudinaryMessage(body: string): string {
  try {
    const error = asRecord(asRecord(JSON.parse(body))?.error)
    return (error && text(error, 'message')) ?? ''
  } catch {
    return ''
  }
}

/**
 * Envoi direct à Cloudinary par `XMLHttpRequest` (seul moyen d'avoir la progression) : requête à part, sans le jeton de
 * l'application. Rend l'adresse `secure_url` de l'image.
 */
export function uploadToCloudinary(
  file: Blob,
  signature: PhotoSignature,
  { onProgress, signal }: { onProgress: (percent: number) => void; signal: AbortSignal },
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new PhotoUploadError('aborted'))
      return
    }
    const xhr = new XMLHttpRequest()
    const abort = () => xhr.abort()
    signal.addEventListener('abort', abort, { once: true })
    xhr.open('POST', cloudinaryUploadUrl(signature))
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    })
    xhr.addEventListener('load', () => {
      signal.removeEventListener('abort', abort)
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const url = text(asRecord(JSON.parse(xhr.responseText)) ?? {}, 'secure_url')
          if (url) {
            resolve(url)
            return
          }
        } catch {
          // Réponse illisible : traitée comme un refus.
        }
        reject(new PhotoUploadError('rejected'))
        return
      }
      reject(new PhotoUploadError(/stale request/i.test(cloudinaryMessage(xhr.responseText)) ? 'expired' : 'rejected'))
    })
    xhr.addEventListener('error', () => {
      signal.removeEventListener('abort', abort)
      reject(new PhotoUploadError('network'))
    })
    xhr.addEventListener('abort', () => {
      signal.removeEventListener('abort', abort)
      reject(new PhotoUploadError('aborted'))
    })
    xhr.send(uploadForm(file, signature))
  })
}

export const UPLOAD_MESSAGES: Record<Exclude<UploadFailure, 'aborted'>, string> = {
  expired: 'Le délai est dépassé, recommencez.',
  rejected: 'L’envoi de l’image a échoué. Réessayez avec une autre image ou plus tard.',
  network: 'L’envoi de l’image a échoué. Vérifiez votre connexion puis réessayez.',
}
