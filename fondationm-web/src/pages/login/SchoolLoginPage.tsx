import { AuthSplitLayout } from '../../components/layout/AuthSplitLayout'
import { AuthTabs } from '../../components/layout/AuthTabs'
import { SCHOOL_COLUMN } from '../register/authColumns'
import { LoginForm } from './LoginForm'
import { PersonaLinks } from './PersonaLinks'

/** `/connexion` : établissement (colonne W1-E1, formulaire aux valeurs de W3 ; aucune maquette dédiée). */
export function SchoolLoginPage() {
  return (
    <AuthSplitLayout {...SCHOOL_COLUMN}>
      <AuthTabs persona="school" active="login" />
      <LoginForm title="Bon retour parmi nous" subtitle="Connectez-vous avec votre adresse e-mail." />
      <PersonaLinks current="school" />
    </AuthSplitLayout>
  )
}
