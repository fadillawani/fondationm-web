import { Link } from 'react-router'
import { PATHS } from '../../auth/roles'
import { cn } from '../../lib/cn'

type AuthPersona = 'school' | 'speaker'

/** École : actif indigo / crème ; intervenant : actif encre / crème (maquettes W1-E1, W2-E1). */
const PERSONAS: Record<AuthPersona, { login: string; register: string; registerLabel: string; active: string }> = {
  school: { login: PATHS.login, register: PATHS.registerSchool, registerLabel: 'Créer un compte', active: 'bg-indigo text-cream' },
  speaker: {
    login: PATHS.loginSpeaker,
    register: PATHS.registerSpeaker,
    registerLabel: 'Devenir intervenant',
    active: 'bg-ink text-cream',
  },
}

interface AuthTabsProps {
  persona: AuthPersona
  active: 'login' | 'register'
}

const TAB = 'flex min-h-touch items-center justify-center rounded-[10px] px-3 text-center text-sm md:rounded-[12px] md:text-[15px]'

export function AuthTabs({ persona, active }: AuthTabsProps) {
  const { login, register, registerLabel, active: activeClass } = PERSONAS[persona]
  const tabs = [
    { key: 'login', to: login, label: 'Se connecter' },
    { key: 'register', to: register, label: registerLabel },
  ] as const

  return (
    <nav aria-label="Connexion ou inscription" className="grid grid-cols-2 gap-1 rounded-[14px] bg-canvas p-1 md:rounded-2xl md:p-1.5">
      {tabs.map((tab) =>
        tab.key === active ? (
          <span key={tab.key} aria-current="page" className={cn(TAB, 'font-black', activeClass)}>
            {tab.label}
          </span>
        ) : (
          <Link key={tab.key} to={tab.to} className={cn(TAB, 'font-extrabold text-muted hover:text-ink')}>
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  )
}
