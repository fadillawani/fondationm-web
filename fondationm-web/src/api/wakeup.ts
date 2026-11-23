import { useSyncExternalStore } from 'react'

let slowRequests = 0
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function startSlowRequest(): void {
  slowRequests += 1
  notify()
}

export function endSlowRequest(): void {
  slowRequests = Math.max(0, slowRequests - 1)
  notify()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function isWakingUp(): boolean {
  return slowRequests > 0
}

export function useServerWakingUp(): boolean {
  return useSyncExternalStore(subscribe, isWakingUp, isWakingUp)
}
