export type ApiEvent = 'unauthenticated' | 'account-not-validated' | 'password-change-required'

type Listener = (event: ApiEvent) => void

const listeners = new Set<Listener>()

export function onApiEvent(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitApiEvent(event: ApiEvent): void {
  for (const listener of listeners) listener(event)
}
