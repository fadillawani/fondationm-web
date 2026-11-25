import { durationLabel, parseComment, type FeedbackStories } from './feedbackFormat'
import { STORY_HEADINGS, ratingLabel } from './feedbackText'

interface FeedbackContentProps {
  comment: string | null
  rating: number | null
  /** Récits affichés (« Mon impact » replie l'échange et l'apport). */
  stories?: readonly (keyof FeedbackStories)[]
}

const STORY_KEYS: readonly (keyof FeedbackStories)[] = ['moment', 'exchange', 'takeaway']

/** Lecture d'un retour : chiffres, note, pastilles et récits relus par le parseur, sinon le texte brut. */
export function FeedbackContent({ comment, rating, stories = STORY_KEYS }: FeedbackContentProps) {
  const parsed = parseComment(comment)
  const label = ratingLabel(rating)
  const stats =
    parsed.kind === 'structured' && parsed.figures !== null
      ? [
          [String(parsed.figures.present), parsed.figures.present > 1 ? 'présents' : 'présent'],
          ...(parsed.figures.girls === null ? [] : [[String(parsed.figures.girls), parsed.figures.girls > 1 ? 'filles' : 'fille']]),
          ...(parsed.figures.boys === null ? [] : [[String(parsed.figures.boys), parsed.figures.boys > 1 ? 'garçons' : 'garçon']]),
          ...(parsed.figures.averageAge === null ? [] : [[`${parsed.figures.averageAge} ans`, 'âge moyen']]),
          ...(parsed.figures.durationMinutes === null ? [] : [[durationLabel(parsed.figures.durationMinutes), 'durée']]),
        ]
      : []

  return (
    <div className="flex flex-col gap-3">
      {stats.length > 0 && (
        <dl aria-label="La classe" className="grid grid-cols-[repeat(auto-fit,minmax(78px,1fr))] gap-2">
          {stats.map(([value, key]) => (
            <div key={key} className="flex flex-col-reverse rounded-[12px] bg-canvas px-2.5 py-2">
              <dt className="text-xs font-bold text-muted">{key}</dt>
              <dd className="font-display text-xl leading-none text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {label && (
        <p className="text-sm font-bold text-ink">
          Dans l'ensemble : <span className="rounded-pill bg-ink px-2.5 py-1 text-xs font-black text-cream">{label}</span>
        </p>
      )}
      {parsed.kind === 'structured' && parsed.pupils.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-ink">
          Les élèves étaient :
          {parsed.pupils.map((pupil) => (
            <span key={pupil} className="rounded-pill bg-indigo-tint px-2.5 py-1 text-xs font-black text-indigo">
              {pupil}
            </span>
          ))}
        </p>
      )}
      {parsed.kind === 'structured' && parsed.emotions.length > 0 && (
        <ul aria-label="Émotions" className="flex flex-wrap gap-1.5">
          {parsed.emotions.map((emotion) => (
            <li key={emotion} className="rounded-pill border-2 border-terra px-2.5 py-0.5 text-xs font-black text-terra">
              {emotion}
            </li>
          ))}
        </ul>
      )}
      {parsed.kind === 'structured' &&
        stories.map((key) =>
          parsed.stories[key] === '' ? null : (
            <section key={key} aria-label={STORY_HEADINGS[key]} className="flex flex-col gap-1">
              <h4 className="font-sans text-[13px] font-black uppercase text-muted">{STORY_HEADINGS[key]}</h4>
              <p className={key === 'moment' ? 'whitespace-pre-line font-display text-lg leading-snug text-ink' : 'whitespace-pre-line text-sm font-semibold text-ink'}>
                {key === 'moment' ? `« ${parsed.stories[key]} »` : parsed.stories[key]}
              </p>
            </section>
          ),
        )}
      {parsed.kind === 'raw' && <p className="whitespace-pre-line text-sm font-semibold text-ink">{parsed.text}</p>}
      {parsed.kind === 'empty' && <p className="text-sm font-bold text-muted">Aucun texte.</p>}
    </div>
  )
}
