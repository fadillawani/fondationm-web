import { cn } from '../../lib/cn'
import { normalizeName, sameName } from '../../lib/normalize'
import { MAP_CITIES, MAP_COUNTRY } from './mapCities'
import { NetworkMap } from './NetworkMap'
import { useCityPeople, type CityCount } from './schoolData'
import { SpeakerAvatar } from './SpeakerCard'

interface NetworkSectionProps {
  byCity: readonly CityCount[]
  total: number
  myCity: string
  myCountry: string
  selected: CityCount | null
  onSelect: (city: CityCount) => void
}

function isSenegal(entry: CityCount): boolean {
  return entry.country === '' || normalizeName(entry.country) === MAP_COUNTRY
}

function volunteers(count: number): string {
  return `${count} bénévole${count > 1 ? 's' : ''}`
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
 */
export function NetworkSection({ byCity, total, myCity, myCountry, selected, onSelect }: NetworkSectionProps) {
  const senegal = byCity.filter(isSenegal)
  const counts = new Map(senegal.map((entry) => [normalizeName(entry.city), entry.count]))
  const inSenegal = senegal.reduce((sum, entry) => sum + entry.count, 0) || total
  const people = useCityPeople(selected?.city ?? null, selected?.country ?? '')
  const isMine = selected !== null && sameName(selected.city, myCity) && (!myCountry || sameName(selected.country || myCountry, myCountry))
  const shown = people.data?.items ?? []
  const others = (selected?.count ?? people.data?.total ?? 0) - shown.length

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
          <p className="text-xs font-extrabold text-indigo lg:text-sm">{volunteers(inSenegal)} au Sénégal</p>
        </div>
        <NetworkMap counts={counts} selected={selected ? normalizeName(selected.city) : null} label={mapLabel(counts)} />
        <figcaption className="hidden text-xs font-bold text-muted lg:block">
          Carte schématique. La taille du cercle indique le nombre d'intervenants dans la ville.
        </figcaption>
        {selected !== null && shown.length > 0 && (
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex">
              {shown.map((speaker, index) => (
                <SpeakerAvatar key={speaker.id} speaker={speaker} size="xs" className={cn('border-2 border-[#DCE3EF]', index > 0 && '-ml-2')} />
              ))}
            </span>
            <span className="text-[13px] font-extrabold text-ink">
              {volunteers(selected.count)} près de vous, à {selected.city}
            </span>
          </div>
        )}
      </figure>

      <div className="hidden flex-col gap-4 p-[22px] lg:flex">
        {selected !== null && (
          <div aria-live="polite" className="flex flex-col gap-2">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-terra">
              {isMine ? 'Votre zone' : 'Autre zone · en ligne possible'}
            </p>
            <h3 className="text-[28px] leading-none text-ink">{selected.city}</h3>
            <p className="text-sm font-bold text-muted">
              {selected.count > 1
                ? `${selected.count} bénévoles prêts à rencontrer vos élèves`
                : `${selected.count} bénévole prêt à rencontrer vos élèves`}
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
              <p className="text-[13px] font-extrabold text-muted">
                et {others} autre{others > 1 ? 's' : ''} personne{others > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p id="choisir-ville" className="text-xs font-black uppercase tracking-[0.06em] text-muted">
            Choisir une ville
          </p>
          <div role="group" aria-labelledby="choisir-ville" className="flex flex-wrap gap-2">
            {byCity.map((entry) => {
              const pressed = selected !== null && sameName(selected.city, entry.city) && sameName(selected.country, entry.country)
              return (
                <button
                  key={`${entry.city}-${entry.country}`}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => onSelect(entry)}
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
