import { useServerWakingUp } from '../../api/wakeup'

export function WakeupBanner() {
  const wakingUp = useServerWakingUp()

  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-50 flex justify-center p-3">
      {wakingUp && (
        <p className="flex items-center gap-3 rounded-block bg-indigo px-5 py-3 text-sm font-bold text-cream shadow-raised">
          <span
            aria-hidden="true"
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
          Le serveur se réveille, cela peut prendre une à deux minutes…
        </p>
      )}
    </div>
  )
}
