import { formatDate } from '../../lib/formatDate'
import type { Account } from './accounts'

/** Bloc de résultat d'un compte traité (validé ou refusé). */
export function ResultBlock({ account, live = false }: { account: Account; live?: boolean }) {
  if (account.status === 'PENDING') return null
  const decided = formatDate(account.decidedAt)
  const validated = account.status === 'VALIDATED'
  return (
    <section
      role={live ? 'status' : undefined}
      aria-label={validated ? 'Compte validé' : 'Compte refusé'}
      className={
        validated
          ? 'flex flex-col gap-1 rounded-block bg-green-tint p-5 text-green'
          : 'flex flex-col gap-1 rounded-block bg-red-tint p-5 text-red'
      }
    >
      <h3 className="text-xl">{validated ? 'Compte validé' : 'Compte refusé'}</h3>
      <p className="font-semibold">
        {validated
          ? `${account.name} peut maintenant se connecter et utiliser la plateforme.`
          : account.rejectionReason
            ? `Motif transmis : « ${account.rejectionReason} »`
            : 'Aucun motif n’a été transmis.'}
      </p>
      {decided && <p className="text-sm font-bold">Décision du {decided}</p>}
    </section>
  )
}
