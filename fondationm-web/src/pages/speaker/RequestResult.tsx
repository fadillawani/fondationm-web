import { Link } from 'react-router'
import { PATHS } from '../../auth/roles'
import { cn } from '../../lib/cn'
import type { Meeting } from './speakerData'

interface ResultContent {
  title: string
  text: string
  tone: 'success' | 'danger' | 'neutral'
  agendaLink?: boolean
}

const TONES: Record<ResultContent['tone'], { box: string; title: string }> = {
  success: { box: 'bg-[#E8EEDF]', title: 'text-[#3B5221]' },
  danger: { box: 'bg-red-tint', title: 'text-[#8E1518]' },
  neutral: { box: 'bg-[#F1EBDD]', title: 'text-ink' },
}

/** Textes de la maquette W2-E9 ; refus / annulation par la Fondation et réalisation : absents, textes validés en F3. */
function resultContent(meeting: Meeting): ResultContent | null {
  const reason = meeting.reason ? `Motif transmis : « ${meeting.reason} »` : 'Aucun motif n’a été transmis.'
  switch (meeting.status) {
    case 'PENDING':
      return meeting.myDecision === 'VALIDATED'
        ? {
            title: 'Merci, votre accord est enregistré',
            text: 'La Fondation M donne aussi son avis. Dès que vous êtes tous les deux d’accord, la rencontre est confirmée et l’école est prévenue.',
            tone: 'success',
            agendaLink: true,
          }
        : null
    case 'CONFIRMED':
      return {
        title: 'Rencontre confirmée',
        text: 'Vous et la Fondation M avez validé. Les autres demandes sur ce créneau ont été refusées automatiquement.',
        tone: 'success',
        agendaLink: true,
      }
    case 'COMPLETED':
      return { title: 'Rencontre réalisée', text: 'Cette rencontre a eu lieu.', tone: 'neutral', agendaLink: true }
    case 'REFUSED':
      if (meeting.closedBy === 'SPEAKER') {
        return {
          title: 'Vous avez refusé cette demande',
          text: meeting.reason
            ? `Votre mot : « ${meeting.reason} »`
            : 'Aucun motif donné. L’école peut choisir un autre intervenant.',
          tone: 'danger',
        }
      }
      if (meeting.closedBy === 'SYSTEM') {
        return {
          title: 'Refusée automatiquement · créneau pris',
          text: 'Une rencontre a été confirmée avec une autre école sur ce créneau. L’école a été invitée à choisir une autre date.',
          tone: 'neutral',
        }
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

/** Bloc de résultat d'une demande déjà traitée (maquette W2-E9 : titre 15 px / 900, texte 14 px / 600). */
export function RequestResult({ meeting, live = false }: { meeting: Meeting; live?: boolean }) {
  const content = resultContent(meeting)
  if (content === null) return null
  const tone = TONES[content.tone]
  return (
    <section
      role={live ? 'status' : undefined}
      aria-label={content.title}
      className={cn('flex flex-col gap-1 rounded-[14px] px-3.5 py-3 lg:px-4 lg:py-3.5', tone.box)}
    >
      <h3 className={cn('font-sans text-[15px] font-black', tone.title)}>{content.title}</h3>
      <p className="text-[13px] font-semibold text-ink lg:text-sm">{content.text}</p>
      {content.agendaLink && (
        <Link to={PATHS.speakerAgenda} className="inline-flex min-h-touch items-center self-start text-sm font-black text-indigo underline">
          Voir dans mon agenda
        </Link>
      )}
    </section>
  )
}
