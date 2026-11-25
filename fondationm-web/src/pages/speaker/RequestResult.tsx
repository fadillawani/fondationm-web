import type { Meeting } from './speakerData'

/** Bloc de résultat d'une demande déjà traitée (par moi, la Fondation ou le système). */
export function RequestResult({ meeting, live = false }: { meeting: Meeting; live?: boolean }) {
  const content = resultContent(meeting)
  if (content === null) return null
  return (
    <section
      role={live ? 'status' : undefined}
      aria-label={content.title}
      className={
        content.tone === 'success'
          ? 'flex flex-col gap-1 rounded-block bg-green-tint p-5 text-green'
          : content.tone === 'danger'
            ? 'flex flex-col gap-1 rounded-block bg-red-tint p-5 text-red'
            : 'flex flex-col gap-1 rounded-block bg-indigo-tint p-5 text-indigo'
      }
    >
      <h3 className="text-xl">{content.title}</h3>
      <p className="font-semibold">{content.text}</p>
    </section>
  )
}

interface ResultContent {
  title: string
  text: string
  tone: 'success' | 'danger' | 'info'
}

function resultContent(meeting: Meeting): ResultContent | null {
  const reason = meeting.reason ? `Motif transmis : « ${meeting.reason} »` : 'Aucun motif n’a été transmis.'
  switch (meeting.status) {
    case 'PENDING':
      return meeting.myDecision === 'VALIDATED'
        ? {
            title: 'Demande acceptée',
            text: 'Vous avez accepté. La Fondation M donne son avis, et la rencontre sera confirmée dès sa validation.',
            tone: 'success',
          }
        : null
    case 'CONFIRMED':
      return { title: 'Rencontre confirmée', text: 'La Fondation M a validé : la rencontre est confirmée.', tone: 'success' }
    case 'COMPLETED':
      return { title: 'Rencontre réalisée', text: 'Cette rencontre a eu lieu.', tone: 'info' }
    case 'REFUSED':
      if (meeting.closedBy === 'SPEAKER') return { title: 'Demande refusée', text: 'Vous avez refusé cette demande.', tone: 'danger' }
      if (meeting.closedBy === 'SYSTEM') {
        return { title: 'Créneau pris', text: 'Ce créneau a été attribué à une autre demande.', tone: 'danger' }
      }
      return { title: 'Refusée par la Fondation M', text: reason, tone: 'danger' }
    case 'CANCELLED':
      return {
        title: meeting.closedBy === 'FOUNDATION' ? 'Annulée par la Fondation M' : 'Rencontre annulée',
        text: reason,
        tone: 'danger',
      }
  }
}
