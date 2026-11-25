import type { Blocker } from 'react-router'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

/** Confirmation « Quitter sans imprimer ? » d'une navigation bloquée par `useLeaveGuard`. */
export function LeaveGuardModal({ blocker, message }: { blocker: Blocker; message: string }) {
  if (blocker.state !== 'blocked') return null
  return (
    <Modal
      open
      title="Quitter sans imprimer ?"
      onClose={() => blocker.reset?.()}
      footer={
        <>
          <Button size="md" variant="outline" onClick={() => blocker.proceed?.()}>
            Quitter la page
          </Button>
          <Button size="md" onClick={() => blocker.reset?.()}>
            Rester et imprimer
          </Button>
        </>
      }
    >
      <p className="text-[15px] font-semibold text-ink">{message}</p>
    </Modal>
  )
}
