import { RequestTimeoutError } from './errors'
import { endSlowRequest, startSlowRequest } from './wakeup'

export const WAKEUP_NOTICE_DELAY_MS = 5_000
export const REQUEST_TIMEOUT_MS = 90_000

export async function timedFetch(request: Request): Promise<Response> {
  const controller = new AbortController()
  let slow = false
  const wakeupTimer = setTimeout(() => {
    slow = true
    startSlowRequest()
  }, WAKEUP_NOTICE_DELAY_MS)
  const timeoutTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await globalThis.fetch(request, { signal: controller.signal })
  } catch (error) {
    if (controller.signal.aborted) throw new RequestTimeoutError()
    throw error
  } finally {
    clearTimeout(wakeupTimer)
    clearTimeout(timeoutTimer)
    if (slow) endSlowRequest()
  }
}
