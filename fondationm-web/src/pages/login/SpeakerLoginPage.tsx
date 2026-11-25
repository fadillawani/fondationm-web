import { AuthSplitLayout } from '../../components/layout/AuthSplitLayout'
import { AuthTabs } from '../../components/layout/AuthTabs'
import { SPEAKER_COLUMN } from '../register/authColumns'
import { LoginForm } from './LoginForm'
import { PersonaLinks } from './PersonaLinks'

/** `/connexion/intervenant` : colonne orange W2-E1, onglets « Se connecter » / « Devenir intervenant ». */
export function SpeakerLoginPage() {
  return (
    <AuthSplitLayout {...SPEAKER_COLUMN}>
      <AuthTabs persona="speaker" active="login" />
      <LoginForm title="Bon retour parmi nous" subtitle="Connectez-vous avec votre adresse e-mail." />
      <PersonaLinks current="speaker" />
    </AuthSplitLayout>
  )
}
