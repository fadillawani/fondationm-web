import { describe, expect, it } from 'vitest'
import {
  ApiError,
  NetworkFailureError,
  RequestTimeoutError,
  errorFromException,
  errorFromResponse,
  errorMessage,
  isRetryable,
} from './errors'

function response(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers })
}

describe('errorFromResponse', () => {
  it('reprend code, message et fieldErrors du corps', () => {
    const error = errorFromResponse(response(400), {
      code: 'VALIDATION_ERROR',
      message: 'Requête invalide',
      fieldErrors: [{ field: 'email', message: 'E-mail invalide' }, { field: 42 }],
    })

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('Requête invalide')
    expect(error.fieldErrors).toEqual([{ field: 'email', message: 'E-mail invalide' }])
  })

  it.each([
    [400, 'VALIDATION_ERROR'],
    [401, 'UNAUTHENTICATED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [429, 'RATE_LIMITED'],
    [503, 'INTERNAL_ERROR'],
    [418, 'UNKNOWN_ERROR'],
  ])('déduit le code du statut %i quand le corps est absent', (status, code) => {
    expect(errorFromResponse(response(status), undefined).code).toBe(code)
  })

  it('traite tout 429 comme RATE_LIMITED et lit Retry-After', () => {
    const error = errorFromResponse(response(429, { 'Retry-After': '30' }), { code: 'AUTRE' })

    expect(error.code).toBe('RATE_LIMITED')
    expect(error.retryAfterSeconds).toBe(30)
  })

  it('ignore un Retry-After qui n’est pas un nombre de secondes', () => {
    const error = errorFromResponse(response(429, { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }), null)

    expect(error.retryAfterSeconds).toBeNull()
  })
})

describe('errorFromException', () => {
  it('convertit un dépassement de délai en TIMEOUT', () => {
    expect(errorFromException(new RequestTimeoutError()).code).toBe('TIMEOUT')
  })

  it('convertit un échec de fetch (aucune réponse) en NETWORK_ERROR', () => {
    expect(errorFromException(new NetworkFailureError()).code).toBe('NETWORK_ERROR')
  })

  it('ne confond pas une exception interne avec une panne réseau', () => {
    const error = errorFromException(new TypeError("Cannot use 'in' operator to search for 'schoolName' in null"))
    expect(error.code).toBe('UNEXPECTED_ERROR')
    expect(errorMessage(error)).toBe("Une erreur inattendue s'est produite. Réessayez.")
  })

  it('laisse passer une ApiError telle quelle', () => {
    const error = new ApiError({ status: 404, code: 'NOT_FOUND', message: '' })
    expect(errorFromException(error)).toBe(error)
  })
})

describe('errorMessage', () => {
  it('donne un message en français pour les codes connus', () => {
    const error = errorFromResponse(response(401), { code: 'INVALID_CREDENTIALS', message: 'Bad credentials' })
    expect(errorMessage(error)).toBe('E-mail ou mot de passe incorrect.')
  })

  it('indique le délai d’attente quand Retry-After est présent', () => {
    const error = errorFromResponse(response(429, { 'Retry-After': '1' }), null)
    expect(errorMessage(error)).toBe('Trop de tentatives, réessayez dans 1 seconde.')
  })

  it('invite à patienter sans Retry-After', () => {
    expect(errorMessage(errorFromResponse(response(429), null))).toBe(
      'Trop de tentatives. Patientez un peu avant de réessayer.',
    )
  })

  it('reprend le message du serveur pour un code inconnu', () => {
    const error = errorFromResponse(response(409), { code: 'SLOT_TAKEN', message: 'Ce créneau est déjà pris.' })
    expect(error.code).toBe('SLOT_TAKEN')
    expect(errorMessage(error)).toBe('Ce créneau est déjà pris.')
  })

  it('reste lisible pour un code inconnu sans message', () => {
    expect(errorMessage(errorFromResponse(response(409), { code: 'SLOT_TAKEN' }))).toBe(
      'Une erreur inattendue est survenue (SLOT_TAKEN).',
    )
  })
})

describe('isRetryable', () => {
  it('propose de réessayer pour les pannes réseau, délais et erreurs serveur seulement', () => {
    expect(isRetryable(new NetworkFailureError())).toBe(true)
    expect(isRetryable(new RequestTimeoutError())).toBe(true)
    expect(isRetryable(errorFromResponse(response(502), null))).toBe(true)
    expect(isRetryable(errorFromResponse(response(401), { code: 'INVALID_CREDENTIALS' }))).toBe(false)
  })
})

function apiError(code: string, message = '') {
  return new ApiError({ status: 409, code, message })
}

describe('codes du contrat ApiError (F13)', () => {

  it('déduit INTERNAL_ERROR d’un 5xx sans corps, propose « Réessayer », et garde SERVER_ERROR comme synonyme', () => {
    expect(errorFromResponse(response(500), null).code).toBe('INTERNAL_ERROR')
    expect(isRetryable(apiError('INTERNAL_ERROR'))).toBe(true)
    expect(errorMessage(apiError('INTERNAL_ERROR', 'Erreur inattendue, sans détail.'))).toBe('Le serveur a rencontré un problème. Réessayez dans un instant.')
    expect(errorMessage(apiError('SERVER_ERROR'))).toBe('Le serveur a rencontré un problème. Réessayez dans un instant.')
  })

  it.each([
    ['METHOD_NOT_ALLOWED', 'Cette action n’est pas possible ici. Rechargez la page puis réessayez.'],
    ['NOT_ACCEPTABLE', 'Le serveur n’a pas pu répondre dans un format lisible. Réessayez plus tard.'],
    ['UNSUPPORTED_MEDIA_TYPE', 'Le serveur n’a pas pu lire l’envoi. Rechargez la page puis réessayez.'],
    ['PAYLOAD_TOO_LARGE', 'L’envoi est trop volumineux. Raccourcissez le texte puis réessayez.'],
    ['PASSWORD_CHANGE_REQUIRED', 'Vous devez changer votre mot de passe avant de continuer.'],
    ['ACCOUNT_NOT_VALIDATED', "Votre compte n'est pas encore validé par la Fondation."],
    ['FORBIDDEN', "Vous n'avez pas accès à cette page."],
    ['NOT_FOUND', 'Cet élément est introuvable.'],
    ['VALIDATION_ERROR', 'Certains champs sont à corriger.'],
    ['INVALID_CREDENTIALS', 'E-mail ou mot de passe incorrect.'],
    ['UNAUTHENTICATED', 'Votre session a expiré. Merci de vous reconnecter.'],
  ])('message technique fixe pour %s, même avec un message du serveur', (code, expected) => {
    expect(errorMessage(apiError(code, 'Message du serveur'))).toBe(expected)
  })

  it.each([
    ['EMAIL_ALREADY_USED', 'Cette adresse e-mail est déjà utilisée.'],
    ['INVALID_STATUS_TRANSITION', 'Cet élément a déjà été traité. Rechargez la page pour voir son état.'],
    ['CLASS_NOT_EMPTY', 'Cette classe a encore des élèves : retirez-les avant de la supprimer.'],
    ['CLASS_FULL', 'Cette classe est complète.'],
    ['STUDENT_COUNT_TOO_LOW', 'L’effectif déclaré est inférieur au nombre d’élèves déjà rattachés.'],
    ['SLOT_OVERLAP', 'Ce créneau chevauche un de vos créneaux existants.'],
    ['SLOT_NOT_AVAILABLE', 'Ce créneau n’est plus disponible.'],
    ['CLASS_SLOT_OVERLAP', 'Cette classe a déjà une rencontre sur ce créneau.'],
    ['SLOT_PASSED', 'Ce créneau est déjà passé.'],
    ['CLASS_HAS_MEETINGS', 'Cette classe a des rencontres : elle ne peut pas être supprimée.'],
    ['SLOT_HAS_PENDING_MEETINGS', 'Ce créneau a reçu une demande en attente : il ne peut plus être retiré.'],
    ['MEETING_NOT_STARTED', 'Cette rencontre n’a pas encore eu lieu.'],
    ['MEETING_NOT_COMPLETED', 'Cette rencontre n’est pas encore marquée comme réalisée.'],
    ['FEEDBACK_ALREADY_EXISTS', 'Un retour existe déjà pour cette rencontre.'],
    ['FEEDBACK_PUBLISHED', 'Ce retour a déjà été validé par la Fondation M : il ne peut plus être modifié.'],
  ])('code métier %s : message du serveur d’abord, texte français sinon', (code, fallback) => {
    expect(errorMessage(apiError(code))).toBe(fallback)
    expect(errorMessage(apiError(code, 'Message précis du serveur.'))).toBe('Message précis du serveur.')
  })

  it('traite RATE_LIMITED sans délai lisible (Retry-After non exposé par le CORS)', () => {
    expect(errorMessage(errorFromResponse(response(429), { code: 'RATE_LIMITED', message: 'Trop de requêtes' }))).toBe(
      'Trop de tentatives. Patientez un peu avant de réessayer.',
    )
  })
})
