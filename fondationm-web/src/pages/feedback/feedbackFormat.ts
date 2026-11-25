/*
 * Format du `comment` d'un retour d'expérience (décision 87).
 *
 * Le contrat n'a qu'un champ texte libre (2000 caractères, lu tel quel par les donateurs). Les champs structurés
 * des maquettes y sont rangés en blocs étiquetés, lisibles sans outil :
 *
 *   [Classe] 35 présents sur 38 · 19 filles · 16 garçons · âge moyen 17 ans · durée 1 h 30
 *
 *   [Émotions] Fierté, Émotion, Espoir
 *
 *   [Moment marquant] Le texte du récit,
 *   sur plusieurs lignes si besoin.
 *
 * Une étiquette n'est reconnue qu'en début de ligne. Une ligne de récit qui commencerait par une étiquette connue
 * (précédée ou non d'espaces) reçoit une espace de plus à l'écriture, retirée à la lecture : l'aller-retour est exact.
 * Un commentaire qui ne suit pas ce format (texte libre, étiquette inconnue, doublon, ligne « Classe » illisible)
 * est lu comme du texte brut : rien n'est jamais perdu.
 */

export const STORY_MAX = 500
export const COMMENT_MAX = 2000

export const TAGS = {
  figures: 'Classe',
  pupils: 'Les élèves étaient',
  emotions: 'Émotions',
  moment: 'Moment marquant',
  exchange: 'Un échange',
  takeaway: "Ce que j'en retiens",
} as const

type TagKey = keyof typeof TAGS

const TAG_BY_LABEL = new Map<string, TagKey>(Object.entries(TAGS).map(([key, label]) => [label, key as TagKey]))
const TAG_LINE = /^\[([^\]\n]+)\](?: (.*))?$/
const ESCAPED = /^( +)\[([^\]\n]+)\]/

export interface ClassFigures {
  present: number
  /** Effectif de la classe au moment de l'écriture (« sur 38 »). */
  classSize: number | null
  girls: number | null
  boys: number | null
  averageAge: number | null
  durationMinutes: number | null
}

export interface FeedbackStories {
  moment: string
  exchange: string
  takeaway: string
}

export interface StructuredFeedback {
  figures: ClassFigures | null
  pupils: string[]
  emotions: string[]
  stories: FeedbackStories
}

export type ParsedComment = ({ kind: 'structured' } & StructuredFeedback) | { kind: 'raw'; text: string } | { kind: 'empty' }

export const EMPTY_STORIES: FeedbackStories = { moment: '', exchange: '', takeaway: '' }

// ——— Durée ———

/** 90 → « 1 h 30 », 60 → « 1 h », 45 → « 45 min ». */
export function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`
}

function parseDuration(value: string): number | null {
  const minutesOnly = /^(\d{1,3}) min$/.exec(value)
  if (minutesOnly) return Number(minutesOnly[1])
  const withHours = /^(\d{1,2}) h(?: (\d{2}))?$/.exec(value)
  if (withHours === null) return null
  const rest = withHours[2] === undefined ? 0 : Number(withHours[2])
  return rest < 60 ? Number(withHours[1]) * 60 + rest : null
}

// ——— Ligne « Classe » ———

export function figuresLine(figures: ClassFigures): string {
  const parts = [figures.classSize === null ? `${figures.present} présents` : `${figures.present} présents sur ${figures.classSize}`]
  if (figures.girls !== null) parts.push(`${figures.girls} filles`)
  if (figures.boys !== null) parts.push(`${figures.boys} garçons`)
  if (figures.averageAge !== null) parts.push(`âge moyen ${figures.averageAge} ans`)
  if (figures.durationMinutes !== null) parts.push(`durée ${durationLabel(figures.durationMinutes)}`)
  return parts.join(' · ')
}

function parseFigures(line: string): ClassFigures | null {
  const [head, ...rest] = line.split(' · ')
  const present = head === undefined ? null : /^(\d{1,4}) présents(?: sur (\d{1,4}))?$/.exec(head)
  if (!present) return null
  const figures: ClassFigures = {
    present: Number(present[1]),
    classSize: present[2] === undefined ? null : Number(present[2]),
    girls: null,
    boys: null,
    averageAge: null,
    durationMinutes: null,
  }
  for (const part of rest) {
    const girls = /^(\d{1,4}) filles$/.exec(part)
    const boys = /^(\d{1,4}) garçons$/.exec(part)
    const age = /^âge moyen (\d{1,2}) ans$/.exec(part)
    const duration = part.startsWith('durée ') ? parseDuration(part.slice('durée '.length)) : null
    if (girls && figures.girls === null) figures.girls = Number(girls[1])
    else if (boys && figures.boys === null) figures.boys = Number(boys[1])
    else if (age && figures.averageAge === null) figures.averageAge = Number(age[1])
    else if (duration !== null && figures.durationMinutes === null) figures.durationMinutes = duration
    else return null
  }
  return figures
}

// ——— Récits ———

/** Texte saisi normalisé : fins de ligne Unix, sans espaces de bord. */
export function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim()
}

function isTagLine(line: string): boolean {
  const match = TAG_LINE.exec(line)
  return match !== null && match[1] !== undefined && TAG_BY_LABEL.has(match[1])
}

function escapeLine(line: string): string {
  const escaped = ESCAPED.exec(line)
  const needsSpace = isTagLine(line) || (escaped !== null && escaped[2] !== undefined && TAG_BY_LABEL.has(escaped[2]))
  return needsSpace ? ` ${line}` : line
}

function unescapeLine(line: string): string {
  const escaped = ESCAPED.exec(line)
  return escaped !== null && escaped[2] !== undefined && TAG_BY_LABEL.has(escaped[2]) ? line.slice(1) : line
}

function escapeStory(story: string): string {
  return story.split('\n').map(escapeLine).join('\n')
}

// ——— Écriture ———

function listLine(values: readonly string[]): string {
  return values.map((value) => value.trim()).filter((value) => value !== '' && !value.includes(',')).join(', ')
}

/** Sérialise les champs structurés ; un champ vide n'écrit pas de bloc. */
export function serializeFeedback(feedback: StructuredFeedback): string {
  const blocks: string[] = []
  const add = (key: TagKey, content: string) => {
    if (content !== '') blocks.push(`[${TAGS[key]}] ${content}`)
  }
  if (feedback.figures !== null) add('figures', figuresLine(feedback.figures))
  add('pupils', listLine(feedback.pupils))
  add('emotions', listLine(feedback.emotions))
  add('moment', escapeStory(normalizeText(feedback.stories.moment)))
  add('exchange', escapeStory(normalizeText(feedback.stories.exchange)))
  add('takeaway', escapeStory(normalizeText(feedback.stories.takeaway)))
  return blocks.join('\n\n')
}

// ——— Lecture ———

function splitList(content: string): string[] {
  return content
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '')
}

/** Lit un commentaire ; tout ce qui ne suit pas le format est rendu en texte brut. */
export function parseComment(comment: string | null): ParsedComment {
  const source = comment === null ? '' : comment.replace(/\r\n?/g, '\n')
  if (source.trim() === '') return { kind: 'empty' }
  const raw: ParsedComment = { kind: 'raw', text: source.trim() }

  const blocks: { key: TagKey; lines: string[] }[] = []
  for (const line of source.split('\n')) {
    const match = TAG_LINE.exec(line)
    const key = match && match[1] !== undefined ? TAG_BY_LABEL.get(match[1]) : undefined
    if (match && key !== undefined) {
      if (blocks.some((block) => block.key === key)) return raw
      blocks.push({ key, lines: [unescapeLine(match[2] ?? '')] })
    } else {
      const current = blocks.at(-1)
      // Texte avant la première étiquette : ce n'est pas le format, lecture en texte brut.
      if (current === undefined) {
        if (line.trim() !== '') return raw
        continue
      }
      current.lines.push(unescapeLine(line))
    }
  }
  if (blocks.length === 0) return raw

  const parsed: StructuredFeedback = { figures: null, pupils: [], emotions: [], stories: { ...EMPTY_STORIES } }
  for (const block of blocks) {
    const content = block.lines.join('\n').trim()
    switch (block.key) {
      case 'figures': {
        if (block.lines.slice(1).some((line) => line.trim() !== '')) return raw
        const figures = parseFigures(content)
        if (figures === null) return raw
        parsed.figures = figures
        break
      }
      case 'pupils':
      case 'emotions':
        if (block.lines.slice(1).some((line) => line.trim() !== '')) return raw
        parsed[block.key] = splitList(content)
        break
      default:
        parsed.stories[block.key] = content
    }
  }
  return { kind: 'structured', ...parsed }
}

/** Phrase la plus parlante d'un retour (citation du tableau de bord) : le moment marquant, sinon un autre récit. */
export function quoteOf(comment: string | null): string | null {
  const parsed = parseComment(comment)
  if (parsed.kind === 'empty') return null
  if (parsed.kind === 'raw') return parsed.text
  const { moment, exchange, takeaway } = parsed.stories
  return [moment, exchange, takeaway].find((story) => story !== '') ?? null
}
