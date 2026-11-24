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

/** « Le réseau près de chez vous » : carte, panneau de la ville choisie, pastilles des villes. */
export function NetworkSection({ byCity, total, myCity, myCountry, selected, onSelect }: NetworkSectionProps) {
  const senegal = byCity.filter(isSenegal)
  const counts = new Map(senegal.map((entry) => [normalizeName(entry.city), entry.count]))
  const inSenegal = senegal.reduce((sum, entry) => sum + entry.count, 0) || total
  const mapLabel = `Carte schématique du Sénégal. ${MAP_CITIES.filter((city) => counts.has(city.key))
    .map((city) => `${city.name} : ${volunteers(counts.get(city.key) ?? 0)}`)
    .join(', ')}.`
  const people = useCityPeople(selected?.city ?? null, selected?.country ?? '')
  const isMine = selected !== null && sameName(selected.city, myCity) && (!myCountry || sameName(selected.country || myCountry, myCountry))
  const shown = people.data?.items ?? []
  const others = (people.data?.total ?? 0) - shown.length

  return (
    <section aria-labelledby="reseau" className="flex flex-col gap-4 rounded-[22px] bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="reseau" className="text-2xl text-ink">
          Le réseau près de chez vous
        </h2>
        <p className="font-extrabold text-terra">{volunteers(inSenegal)} au Sénégal</p>
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem]">
        <figure className="flex flex-col gap-2">
          <NetworkMap counts={counts} selected={selected ? normalizeName(selected.city) : null} label={mapLabel} />
          <figcaption className="text-xs font-semibold text-muted">
            Carte schématique. La taille du cercle indique le nombre d'intervenants dans la ville.
          </figcaption>
        </figure>

        <div className="flex flex-col gap-4">
          {selected !== null && (
            <div aria-live="polite" className="flex flex-col gap-2 rounded-block bg-canvas p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-terra">
                {isMine ? 'Votre zone' : 'Autre zone · en ligne possible'}
              </p>
              <h3 className="text-xl text-ink">{selected.city}</h3>
              <p className="font-semibold text-ink">{volunteers(selected.count)} prêts à rencontrer vos élèves</p>
              {shown.length > 0 && (
                <ul aria-label={`Intervenants à ${selected.city}`} className="flex flex-col gap-2">
                  {shown.map((speaker) => (
                    <li key={speaker.id} className="flex items-center gap-2">
                      <SpeakerAvatar speaker={speaker} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-extrabold text-ink">{speaker.fullName}</span>
                        {speaker.jobTitle && (
                          <span className="block truncate text-xs font-semibold text-muted">{speaker.jobTitle}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {others > 0 && (
                <p className="text-sm font-bold text-muted">
                  et {others} autre{others > 1 ? 's' : ''} personne{others > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p id="choisir-ville" className="text-[13px] font-extrabold text-ink">
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
                    className={
                      pressed
                        ? 'inline-flex min-h-touch items-center rounded-pill border-2 border-terra bg-terra px-4 text-sm font-extrabold text-white'
                        : 'inline-flex min-h-touch items-center rounded-pill border-2 border-line bg-surface px-4 text-sm font-extrabold text-ink hover:border-muted'
                    }
                  >
                    {entry.city} · {entry.count}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
