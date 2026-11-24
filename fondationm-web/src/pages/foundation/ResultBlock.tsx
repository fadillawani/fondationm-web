import type { Account } from './accounts'

function validatedText(account: Account): string {
  if (account.role === 'SCHOOL') {
    return 'L’établissement accède maintenant à son tableau de bord et peut demander des rencontres.'
  }
  // Maquette : « … Un e-mail de bienvenue lui a été envoyé. » retiré (le backend n'envoie pas d'e-mail).
  const prenom = account.name.trim().split(/\s+/)[0] ?? account.name
  return `${prenom} peut maintenant publier ses créneaux.`
}

/** Bloc de résultat d'un compte traité (maquette W3-comptes). La date figure dans les faits (« Validé le »). */
export function ResultBlock({ account, live = false }: { account: Account; live?: boolean }) {
  if (account.status === 'PENDING') return null
  const validated = account.status === 'VALIDATED'
  return (
    <section
      role={live ? 'status' : undefined}
      aria-label={validated ? 'Compte validé' : 'Compte refusé'}
      className={
        validated
          ? 'flex flex-col gap-1 rounded-[14px] bg-[#E8EEDF] px-3.5 py-3 lg:px-4 lg:py-3.5'
          : 'flex flex-col gap-1 rounded-[14px] bg-red-tint px-3.5 py-3 lg:px-4 lg:py-3.5'
      }
    >
      <h3 className={validated ? 'font-sans text-[15px] font-black text-[#3B5221]' : 'font-sans text-[15px] font-black text-[#8E1518]'}>
        {validated ? 'Compte validé' : 'Compte refusé'}
      </h3>
      <p className="text-[13px] font-semibold text-ink lg:text-sm">
        {validated
          ? validatedText(account)
          : account.rejectionReason
            ? `Motif transmis : « ${account.rejectionReason} »`
            : 'Aucun motif transmis.'}
      </p>
    </section>
  )
}
