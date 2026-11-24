import type { MouseEvent } from 'react'
import { cn } from '../../lib/cn'
import { ONLINE_MEETINGS_ENABLED } from '../../lib/features'
import { normalizeName, sameName } from '../../lib/normalize'
import { MAP_CITIES, MAP_COUNTRY } from './mapCities'
import { NetworkMap } from './NetworkMap'
import type { CityCount, SpeakerSummary } from './schoolData'
import { SpeakerAvatar } from './SpeakerCard'

/** Personnes montrées dans le panneau de la ville (maquette : 4, puis « et {n} autres personnes »). */
const PANEL_PEOPLE = 4

export interface ChosenCity {
  city: string
  country: string
}

interface NetworkSectionProps {
  /** Villes et nombres sous les filtres actifs (statistiques sans filtre). */
  byCity: readonly CityCount[]
  total: number
  /** Au moins un filtre (secteur, recherche ; format s'il est réactivé) est actif. */
  filtered: boolean
  /** Le comptage sous filtres a atteint la limite de pages. */
  partial: boolean
  myCity: string
  myCountry: string
  /** Ville choisie, tirée de `?zone=` (aucune pour « Toutes les zones »). */
  selected: ChosenCity | null
  /** Intervenants de la ville choisie sous les filtres (requête partagée avec la liste « À {ville} »). */
  people: { items: readonly SpeakerSummary[]; total: number } | null
  /** Identifiant du titre de la liste « À {ville} », cible du lien « et {n} autres personnes ». */
  listAnchor: string
  onSelect: (city: string, country: string) => void
}

function isSenegal(entry: CityCount): boolean {
  return entry.country === '' || normalizeName(entry.country) === MAP_COUNTRY
}

function volunteers(count: number): string {
  return `${count} bénévole${count > 1 ? 's' : ''}`
}

function matchingLine(count: number): string {
  return count > 1 ? `${count} intervenants correspondent à vos critères` : `${count} intervenant correspond à vos critères`
}

/** « Carte du Sénégal : 23 intervenants à Dakar, 7 à Thiès, … » (maquette, villes par nombre décroissant). */
function mapLabel(counts: ReadonlyMap<string, number>): string {
  const cities = MAP_CITIES.filter((city) => (counts.get(city.key) ?? 0) > 0).toSorted(
    (a, b) => (counts.get(b.key) ?? 0) - (counts.get(a.key) ?? 0),
  )
  const parts = cities.map((city, index) => {
    const n = counts.get(city.key) ?? 0
    return index === 0 ? `${n} intervenant${n > 1 ? 's' : ''} à ${city.name}` : `${n} à ${city.name}`
  })
  return parts.length > 0 ? `Carte du Sénégal : ${parts.join(', ')}` : 'Carte du Sénégal'
}

/**
 * « Le réseau près de chez vous » (maquette W1-E3) : carte sur fond `#DCE3EF` à gauche, panneau de la ville
 * choisie et pastilles des villes à droite ; sur mobile, bloc « Le réseau » avec la carte et 4 avatars.
 * La ville choisie vient de l'URL (`?zone=`) : carte, pastilles, select et listes partagent un seul état.
 */
export function NetworkSection({
  byCity,
  total,
  filtered,
  partial,
  myCity,
  myCountry,
  selected,
  people,
  listAnchor,
  onSelect,
}: NetworkSectionProps) {
  const senegal = byCity.filter(isSenegal)
  const counts = new Map<string, number>()
  for (const entry of senegal) {
    const key = normalizeName(entry.city)
    counts.set(key, (counts.get(key) ?? 0) + entry.count)
  }
  const inSenegal = senegal.reduce((sum, entry) => sum + entry.count, 0) || total
  const isMine =
    selected !== null && sameName(selected.city, myCity) && (!myCountry || !selected.country || sameName(selected.country, myCountry))
  const selectedEntry = selected ? byCity.find((entry) => sameName(entry.city, selected.city)) : undefined
  const count = people?.total ?? selectedEntry?.count ?? 0
  const shown = (people?.items ?? []).slice(0, PANEL_PEOPLE)
  const others = (people?.total ?? 0) - shown.length

  const goToList = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(listAnchor)
    if (target === null) return
    event.preventDefault()
    target.focus()
  }

  return (
    <section
      aria-labelledby="reseau"
      className="overflow-hidden rounded-[20px] bg-[#DCE3EF] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:rounded-[24px] lg:bg-surface"
    >
      <figure className="flex flex-col gap-2 bg-[#DCE3EF] p-3.5 lg:p-[22px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="reseau" className="text-[19px] uppercase text-ink lg:text-2xl">
            <span className="lg:hidden">Le réseau</span>
            <span className="hidden lg:inline">Le réseau près de chez vous</span>
          </h2>
          <p className="text-xs font-extrabold text-indigo lg:text-sm">
            {filtered ? matchingLine(total) : `${volunteers(inSenegal)} au Sénégal`}
          </p>
        </div>
        <NetworkMap
          counts={counts}
          selected={selected ? normalizeName(selected.city) : null}
          mine={myCity ? normalizeName(myCity) : null}
          label={mapLabel(counts)}
          onSelect={(city) => onSelect(city.name, byCity.find((entry) => sameName(entry.city, city.name))?.country ?? '')}
        />
        <figcaption className="hidden text-xs font-bold text-muted lg:block">
          Carte schématique. La taille du cercle indique le nombre d'intervenants dans la ville.
        </figcaption>
        {partial && <p className="text-xs font-bold text-muted">Chiffres partiels : affinez la recherche pour tout compter.</p>}
        {selected !== null && shown.length > 0 && (
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex">
              {shown.map((speaker, index) => (
                <SpeakerAvatar key={speaker.id} speaker={speaker} size="xs" className={cn('border-2 border-[#DCE3EF]', index > 0 && '-ml-2')} />
              ))}
            </span>
            <span className="text-[13px] font-extrabold text-ink">
              {isMine ? `${volunteers(count)} près de vous, à ${selected.city}` : `${volunteers(count)} à ${selected.city}`}
            </span>
          </div>
        )}
      </figure>

      <div className="hidden flex-col gap-4 p-[22px] lg:flex">
        {selected !== null ? (
          <div aria-live="polite" className="flex flex-col gap-2">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-terra">
              {isMine ? 'Votre zone' : ONLINE_MEETINGS_ENABLED ? 'Autre zone · en ligne possible' : 'Autre zone'}
            </p>
            <h3 className="text-[28px] leading-none text-ink">{selected.city}</h3>
            <p className="text-sm font-bold text-muted">
              {count === 0
                ? 'Aucun bénévole pour ces critères.'
                : count > 1
                  ? `${count} bénévoles prêts à rencontrer vos élèves`
                  : `${count} bénévole prêt à rencontrer vos élèves`}
            </p>
            {shown.length > 0 && (
              <ul aria-label={`Intervenants à ${selected.city}`} className="flex flex-col gap-2.5">
                {shown.map((speaker) => (
                  <li key={speaker.id} className="flex items-center gap-2.5">
                    <SpeakerAvatar speaker={speaker} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-ink">{speaker.fullName}</span>
                      {speaker.jobTitle && <span className="block truncate text-xs font-bold text-muted">{speaker.jobTitle}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {others > 0 && (
              <a
                href={`#${listAnchor}`}
                onClick={goToList}
                className="self-start text-[13px] font-extrabold text-indigo underline underline-offset-2 hover:text-ink"
              >
                et {others} autre{others > 1 ? 's' : ''} personne{others > 1 ? 's' : ''}
              </a>
            )}
          </div>
        ) : (
          <div aria-live="polite" className="flex flex-col gap-2">
            <h3 className="text-[28px] leading-none text-ink">Toutes les zones</h3>
            <p className="text-sm font-bold text-muted">{filtered ? matchingLine(total) : volunteers(total)}</p>
            <p className="text-sm font-bold text-muted">Choisissez une ville sur la carte ou ci-dessous.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p id="choisir-ville" className="text-xs font-black uppercase tracking-[0.06em] text-muted">
            Choisir une ville
          </p>
          <div role="group" aria-labelledby="choisir-ville" className="flex flex-wrap gap-2">
            {byCity.map((entry) => {
              const pressed = selected !== null && sameName(selected.city, entry.city)
              return (
                <button
                  key={`${entry.city}-${entry.country}`}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => onSelect(entry.city, entry.country)}
                  className={cn(
                    'inline-flex min-h-9 items-center rounded-pill border-2 px-3 text-[13px] font-extrabold',
                    pressed ? 'border-terra bg-terra text-white' : 'border-line bg-surface text-ink hover:border-muted',
                  )}
                >
                  {entry.city} · {entry.count}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
