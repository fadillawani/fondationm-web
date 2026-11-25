import { LoginSplitLayout } from '../../components/layout/LoginSplitLayout'
import { LoginForm } from './LoginForm'
import { SchoolOrSpeakerLink } from './PersonaLinks'

/** `/connexion/fondation` (maquette W3-connexion). */
export function FoundationLoginPage() {
  return (
    <LoginSplitLayout
      tone="terra"
      eyebrow="Espace équipe"
      title="Chaque validation rapproche une classe d'un métier"
      intro="Écoles, intervenants, rencontres, retours d'expérience et donateurs : tout le programme au même endroit."
      note="Accès réservé à l'équipe de la Fondation M."
    >
      <LoginForm
        title="Bon retour parmi nous"
        subtitle="Connectez-vous avec votre adresse de la Fondation."
        footer="Pas encore d'accès ? Demandez-le à la coordination du programme."
      />
      <SchoolOrSpeakerLink />
    </LoginSplitLayout>
  )
}
