export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  ACCOUNT_NOT_VALIDATED: 'ACCOUNT_NOT_VALIDATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  PASSWORD_CHANGE_REQUIRED: 'PASSWORD_CHANGE_REQUIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** Ancien code (avant le contrat documenté) : gardé comme synonyme d'INTERNAL_ERROR. */
  SERVER_ERROR: 'SERVER_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  NOT_ACCEPTABLE: 'NOT_ACCEPTABLE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  EMAIL_ALREADY_USED: 'EMAIL_ALREADY_USED',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  CLASS_NOT_EMPTY: 'CLASS_NOT_EMPTY',
  CLASS_FULL: 'CLASS_FULL',
  STUDENT_COUNT_TOO_LOW: 'STUDENT_COUNT_TOO_LOW',
  SLOT_OVERLAP: 'SLOT_OVERLAP',
  SLOT_NOT_AVAILABLE: 'SLOT_NOT_AVAILABLE',
  CLASS_SLOT_OVERLAP: 'CLASS_SLOT_OVERLAP',
  SLOT_PASSED: 'SLOT_PASSED',
  CLASS_HAS_MEETINGS: 'CLASS_HAS_MEETINGS',
  SLOT_HAS_PENDING_MEETINGS: 'SLOT_HAS_PENDING_MEETINGS',
  MEETING_NOT_STARTED: 'MEETING_NOT_STARTED',
  MEETING_NOT_COMPLETED: 'MEETING_NOT_COMPLETED',
  FEEDBACK_ALREADY_EXISTS: 'FEEDBACK_ALREADY_EXISTS',
  FEEDBACK_PUBLISHED: 'FEEDBACK_PUBLISHED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export interface FieldError {
  field: string
  message: string
}

interface ApiErrorInit {
  status: number
  code: string
  message: string
  fieldErrors?: FieldError[]
  retryAfterSeconds?: number | null
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: FieldError[]
  readonly retryAfterSeconds: number | null

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fieldErrors = init.fieldErrors ?? []
    this.retryAfterSeconds = init.retryAfterSeconds ?? null
  }
}

export class RequestTimeoutError extends Error {
  constructor() {
    super('Délai de réponse dépassé')
    this.name = 'RequestTimeoutError'
  }
}

/** Échec de fetch lui-même : aucune réponse du serveur (hors ligne, DNS, CORS, connexion coupée). */
export class NetworkFailureError extends Error {
  constructor(options?: ErrorOptions) {
    super('Aucune réponse du serveur', options)
    this.name = 'NetworkFailureError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function codeFromStatus(status: number): string {
  if (status === 400) return ERROR_CODES.VALIDATION_ERROR
  if (status === 401) return ERROR_CODES.UNAUTHENTICATED
  if (status === 403) return ERROR_CODES.FORBIDDEN
  if (status === 404) return ERROR_CODES.NOT_FOUND
  if (status === 429) return ERROR_CODES.RATE_LIMITED
  if (status >= 500) return ERROR_CODES.INTERNAL_ERROR
  return ERROR_CODES.UNKNOWN_ERROR
}

function parseFieldErrors(value: unknown): FieldError[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item: unknown) =>
    isRecord(item) && typeof item.field === 'string' && typeof item.message === 'string'
      ? [{ field: item.field, message: item.message }]
      : [],
  )
}

function parseRetryAfter(headers: Headers): number | null {
  const raw = headers.get('Retry-After')?.trim()
  if (raw === undefined || !/^\d+$/.test(raw)) return null
  return Number(raw)
}

export function readErrorCode(body: unknown): string | null {
  return isRecord(body) && typeof body.code === 'string' ? body.code : null
}

export function errorFromResponse(response: Response, body: unknown): ApiError {
  const status = response.status
  const code = status === 429 ? ERROR_CODES.RATE_LIMITED : (readErrorCode(body) ?? codeFromStatus(status))

  return new ApiError({
    status,
    code,
    message: isRecord(body) && typeof body.message === 'string' ? body.message : '',
    fieldErrors: isRecord(body) ? parseFieldErrors(body.fieldErrors) : [],
    retryAfterSeconds: parseRetryAfter(response.headers),
  })
}

export function errorFromException(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  let code: string = ERROR_CODES.UNEXPECTED_ERROR
  if (error instanceof RequestTimeoutError) code = ERROR_CODES.TIMEOUT
  else if (error instanceof NetworkFailureError) code = ERROR_CODES.NETWORK_ERROR
  return new ApiError({ status: 0, code, message: '' })
}

export function invalidResponseError(): ApiError {
  return new ApiError({ status: 0, code: ERROR_CODES.INVALID_RESPONSE, message: '' })
}

const MESSAGES: Partial<Record<string, string>> = {
  [ERROR_CODES.INVALID_CREDENTIALS]: 'E-mail ou mot de passe incorrect.',
  [ERROR_CODES.UNAUTHENTICATED]: 'Votre session a expiré. Merci de vous reconnecter.',
  [ERROR_CODES.ACCOUNT_NOT_VALIDATED]: "Votre compte n'est pas encore validé par la Fondation.",
  [ERROR_CODES.FORBIDDEN]: "Vous n'avez pas accès à cette page.",
  [ERROR_CODES.NOT_FOUND]: 'Cet élément est introuvable.',
  [ERROR_CODES.PASSWORD_CHANGE_REQUIRED]: 'Vous devez changer votre mot de passe avant de continuer.',
  [ERROR_CODES.VALIDATION_ERROR]: 'Certains champs sont à corriger.',
  [ERROR_CODES.SERVER_ERROR]: 'Le serveur a rencontré un problème. Réessayez dans un instant.',
  [ERROR_CODES.INTERNAL_ERROR]: 'Le serveur a rencontré un problème. Réessayez dans un instant.',
  [ERROR_CODES.METHOD_NOT_ALLOWED]: 'Cette action n’est pas possible ici. Rechargez la page puis réessayez.',
  [ERROR_CODES.NOT_ACCEPTABLE]: 'Le serveur n’a pas pu répondre dans un format lisible. Réessayez plus tard.',
  [ERROR_CODES.UNSUPPORTED_MEDIA_TYPE]: 'Le serveur n’a pas pu lire l’envoi. Rechargez la page puis réessayez.',
  [ERROR_CODES.PAYLOAD_TOO_LARGE]: 'L’envoi est trop volumineux. Raccourcissez le texte puis réessayez.',
  [ERROR_CODES.NETWORK_ERROR]:
    'Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.',
  [ERROR_CODES.TIMEOUT]: 'Le serveur met trop de temps à répondre. Réessayez dans un instant.',
  [ERROR_CODES.INVALID_RESPONSE]: 'Le serveur a envoyé une réponse inattendue. Réessayez plus tard.',
  [ERROR_CODES.UNEXPECTED_ERROR]: "Une erreur inattendue s'est produite. Réessayez.",
}

/**
 * Codes métier du contrat (`ApiError`) : le message français du serveur, plus précis, passe en premier ; ce texte ne
 * sert que si le serveur n'en envoie pas (décision 126).
 */
const FALLBACK_MESSAGES: Partial<Record<string, string>> = {
  [ERROR_CODES.EMAIL_ALREADY_USED]: 'Cette adresse e-mail est déjà utilisée.',
  [ERROR_CODES.INVALID_STATUS_TRANSITION]: 'Cet élément a déjà été traité. Rechargez la page pour voir son état.',
  [ERROR_CODES.CLASS_NOT_EMPTY]: 'Cette classe a encore des élèves : retirez-les avant de la supprimer.',
  [ERROR_CODES.CLASS_FULL]: 'Cette classe est complète.',
  [ERROR_CODES.STUDENT_COUNT_TOO_LOW]: 'L’effectif déclaré est inférieur au nombre d’élèves déjà rattachés.',
  [ERROR_CODES.SLOT_OVERLAP]: 'Ce créneau chevauche un de vos créneaux existants.',
  [ERROR_CODES.SLOT_NOT_AVAILABLE]: 'Ce créneau n’est plus disponible.',
  [ERROR_CODES.CLASS_SLOT_OVERLAP]: 'Cette classe a déjà une rencontre sur ce créneau.',
  [ERROR_CODES.SLOT_PASSED]: 'Ce créneau est déjà passé.',
  [ERROR_CODES.CLASS_HAS_MEETINGS]: 'Cette classe a des rencontres : elle ne peut pas être supprimée.',
  [ERROR_CODES.SLOT_HAS_PENDING_MEETINGS]: 'Ce créneau a reçu une demande en attente : il ne peut plus être retiré.',
  [ERROR_CODES.MEETING_NOT_STARTED]: 'Cette rencontre n’a pas encore eu lieu.',
  [ERROR_CODES.MEETING_NOT_COMPLETED]: 'Cette rencontre n’est pas encore marquée comme réalisée.',
  [ERROR_CODES.FEEDBACK_ALREADY_EXISTS]: 'Un retour existe déjà pour cette rencontre.',
  [ERROR_CODES.FEEDBACK_PUBLISHED]: 'Ce retour a déjà été validé par la Fondation M : il ne peut plus être modifié.',
}

export function errorMessage(error: unknown): string {
  const apiError = errorFromException(error)
  if (apiError.code === ERROR_CODES.RATE_LIMITED) {
    const seconds = apiError.retryAfterSeconds
    if (seconds === null) return 'Trop de tentatives. Patientez un peu avant de réessayer.'
    return `Trop de tentatives, réessayez dans ${seconds} ${seconds > 1 ? 'secondes' : 'seconde'}.`
  }
  return (
    MESSAGES[apiError.code] ??
    (apiError.message || FALLBACK_MESSAGES[apiError.code] || `Une erreur inattendue est survenue (${apiError.code}).`)
  )
}

export function isRetryable(error: unknown): boolean {
  const { code } = errorFromException(error)
  return (
    code === ERROR_CODES.NETWORK_ERROR ||
    code === ERROR_CODES.TIMEOUT ||
    code === ERROR_CODES.SERVER_ERROR ||
    code === ERROR_CODES.INTERNAL_ERROR ||
    code === ERROR_CODES.UNEXPECTED_ERROR
  )
}
