import type { Blocker } from 'react-router'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface LeaveGuardModalProps {
  blocker: Blocker
  message: string
  /** Textes par défaut : codes non imprimés (F6, F8). */
  title?: string
  stayLabel?: string
}

/** Confirmation « Quitter sans imprimer ? » d'une navigation bloquée par `useLeaveGuard`. */
export function LeaveGuardModal({ blocker, message, title = 'Quitter sans imprimer ?', stayLabel = 'Rester et imprimer' }: LeaveGuardModalProps) {
  if (blocker.state !== 'blocked') return null
  return (
    <Modal
      open
      title={title}
      onClose={() => blocker.reset?.()}
      footer={
        <>
          <Button size="md" variant="outline" onClick={() => blocker.proceed?.()}>
            Quitter la page
          </Button>
          <Button size="md" onClick={() => blocker.reset?.()}>
            {stayLabel}
          </Button>
        </>
      }
    >
      <p className="text-[15px] font-semibold text-ink">{message}</p>
    </Modal>
  )
}
