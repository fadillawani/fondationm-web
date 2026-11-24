import { ReasonForm, type ReasonValues } from '../../components/ui/ReasonForm'

export type RejectValues = ReasonValues

interface RejectFormProps {
  submitting: boolean
  onSubmit: (values: RejectValues, setServerError: (message: string) => void) => void
  onCancel: () => void
}

export function RejectForm(props: RejectFormProps) {
  return (
    <ReasonForm
      {...props}
      formLabel="Refuser le compte"
      fieldLabel="Motif du refus"
      fieldNote="(transmis à la personne)"
      placeholder="Ex. : nous n'avons pas pu vérifier l'établissement. Pouvez-vous nous envoyer un justificatif ?"
      maxLength={1000}
      requiredMessage="Indiquez le motif du refus : il est transmis à la personne."
      submitLabel="Confirmer le refus"
    />
  )
}
