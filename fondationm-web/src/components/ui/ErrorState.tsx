import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retrying?: boolean
}

export function ErrorState({
  title = 'Oups, quelque chose a coincé',
  message,
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-block border-l-[6px] border-red bg-red-tint px-6 py-8 text-center text-red"
    >
      <h2 className="text-2xl">{title}</h2>
      <p className="max-w-md font-semibold">{message}</p>
      {onRetry && (
        <Button variant="danger" onClick={onRetry} loading={retrying}>
          Réessayer
        </Button>
      )}
    </div>
  )
}
