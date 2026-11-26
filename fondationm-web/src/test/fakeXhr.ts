import { vi } from 'vitest'

/**
 * `XMLHttpRequest` simulé pour l'envoi à Cloudinary (F13) : aucun appel réseau. Le test choisit la réponse avec
 * `respond`, `progress`, `fail` ; `FakeXhr.last()` donne la dernière requête envoyée.
 */
export class FakeXhr extends EventTarget {
  static instances: FakeXhr[] = []
  /** Réponse automatique à l'envoi (sinon le test répond lui-même). */
  static autoRespond: ((xhr: FakeXhr) => void) | null = null

  readonly upload = new EventTarget()
  method = ''
  url = ''
  headers: Record<string, string> = {}
  body: FormData | null = null
  status = 0
  responseText = ''
  aborted = false

  static last(): FakeXhr {
    const xhr = FakeXhr.instances.at(-1)
    if (xhr === undefined) throw new Error('Aucun envoi à Cloudinary')
    return xhr
  }

  static install() {
    FakeXhr.instances = []
    FakeXhr.autoRespond = null
    vi.stubGlobal('XMLHttpRequest', FakeXhr)
  }

  open(method: string, url: string) {
    this.method = method
    this.url = url
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }

  send(body: FormData) {
    this.body = body
    FakeXhr.instances.push(this)
    queueMicrotask(() => FakeXhr.autoRespond?.(this))
  }

  abort() {
    this.aborted = true
    this.dispatchEvent(new Event('abort'))
  }

  progress(loaded: number, total: number) {
    const event = new Event('progress')
    Object.assign(event, { lengthComputable: true, loaded, total })
    this.upload.dispatchEvent(event)
  }

  respond(status: number, body: unknown) {
    this.status = status
    this.responseText = JSON.stringify(body)
    this.dispatchEvent(new Event('load'))
  }

  fail() {
    this.dispatchEvent(new Event('error'))
  }

  /** Champs du `FormData` (le fichier remplacé par son nom). */
  fields(): Record<string, string> {
    const fields: Record<string, string> = {}
    for (const [key, value] of this.body?.entries() ?? []) fields[key] = typeof value === 'string' ? value : `fichier:${value.name}`
    return fields
  }
}

/** Réponse de `POST /api/me/photo/signature` (contrat PhotoSignatureResponse ; valeurs factices). */
export const SIGNATURE = {
  cloudName: 'nuage-de-test',
  apiKey: 'cle-publique-factice',
  timestamp: 1_795_000_000,
  signature: 'signature-factice-0123456789abcdef',
  assetFolder: 'fondationm/profils',
  publicId: '7f1c2a9e-0000-4000-8000-000000000001',
  overwrite: true,
  invalidate: true,
  allowedFormats: 'jpg,png,webp',
  transformation: 'c_limit,w_800,h_800',
  maxFileSize: 5_242_880,
}

export const SECURE_URL = 'https://res.cloudinary.com/nuage-de-test/image/upload/v1795000001/7f1c2a9e-0000-4000-8000-000000000001.jpg'

const HEADS = {
  jpg: [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d],
  webp: [0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
} as const

/** Fichier image factice aux premiers octets réels du format. */
export function imageFile(name: string, type: string, head: keyof typeof HEADS = 'jpg', size = 2048): File {
  const bytes = new Uint8Array(size)
  bytes.set(HEADS[head])
  return new File([bytes], name, { type })
}
