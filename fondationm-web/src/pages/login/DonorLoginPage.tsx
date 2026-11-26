import { LoginSplitLayout } from '../../components/layout/LoginSplitLayout'
import { DONOR_CONTACT_EMAIL } from '../../lib/referenceData'
import { LoginForm } from './LoginForm'
import { SchoolOrSpeakerLink } from './PersonaLinks'

/** `/connexion/donateur` (maquette W4-connexion). */
export function DonorLoginPage() {
  return (
    <LoginSplitLayout
      tone="green"
      eyebrow="Espace donateur"
      title="Voyez ce que votre soutien fait naître"
      intro="Chiffres du programme, retours des écoles et des intervenants validés par la Fondation, et vos échanges avec l'équipe."
      note="Votre accès vous a été envoyé par la Fondation M."
    >
      <LoginForm
        title="Bon retour parmi nous"
        subtitle="Utilisez l'accès remis par la Fondation M."
        variant="success"
        footer={
          <>
            Accès perdu ? Écrivez à{' '}
            <a
              href={`mailto:${DONOR_CONTACT_EMAIL}`}
              className="font-extrabold text-indigo underline underline-offset-2 hover:text-ink"
            >
              {DONOR_CONTACT_EMAIL}
            </a>
            .
          </>
        }
      />
      <SchoolOrSpeakerLink />
    </LoginSplitLayout>
  )
}
