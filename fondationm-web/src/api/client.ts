import createClient, { type Middleware } from 'openapi-fetch'
import { tokenStorage } from '../auth/tokenStorage'
import { ERROR_CODES, errorFromException, errorFromResponse, readErrorCode } from './errors'
import { emitApiEvent } from './events'
import type { paths } from './schema'
import { timedFetch } from './transport'

const LOGIN_PATH = '/api/auth/login'

function apiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL
  if (!url) throw new Error('VITE_API_URL est absent : copiez .env.example vers .env.')
  return url.replace(/\/+$/, '')
}

async function responseErrorCode(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.clone().json()
    return readErrorCode(body)
  } catch {
    return null
  }
}

const authMiddleware: Middleware = {
  onRequest({ request, schemaPath }) {
    const token = tokenStorage.get()
    if (token !== null && schemaPath !== LOGIN_PATH) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    return request
  },
  async onResponse({ request, response, schemaPath }) {
    if (response.status === 401) {
      const isLogin = request.method === 'POST' && schemaPath === LOGIN_PATH
      if (!isLogin) emitApiEvent('unauthenticated')
    } else if (response.status === 403) {
      const code = await responseErrorCode(response)
      if (code === ERROR_CODES.PASSWORD_CHANGE_REQUIRED) emitApiEvent('password-change-required')
      if (code === ERROR_CODES.ACCOUNT_NOT_VALIDATED) emitApiEvent('account-not-validated')
    }
    return response
  },
}

export const api = createClient<paths>({ baseUrl: apiBaseUrl(), fetch: timedFetch })
api.use(authMiddleware)

interface FetchResult<T> {
  data?: T
  error?: unknown
  response: Response
}

export async function unwrap<T>(call: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>
  try {
    result = await call
  } catch (error) {
    throw errorFromException(error)
  }
  if (!result.response.ok || result.error !== undefined) {
    throw errorFromResponse(result.response, result.error)
  }
  return result.data as T
}
