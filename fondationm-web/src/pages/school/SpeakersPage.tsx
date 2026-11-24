import { useState, type FormEvent } from 'react'
import { PageTitle } from '../../components/layout/PageTitle'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useCurrentUser } from '../../auth/currentUserContext'
import { Alert } from '../../components/ui/Alert'
import { ChoiceGroup } from '../../components/ui/ChoiceGroup'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Spinner } from '../../components/ui/Spinner'
import { parseIso } from '../../lib/dateTime'
import { normalizeName, sameName } from '../../lib/normalize'
import { SECTORS, type Sector } from '../../lib/referenceData'
import { useNow } from '../../lib/useNow'
import { NetworkSection } from './NetworkSection'
import { useSchoolMeetings, type SchoolMeeting } from './meetingsData'
import { RefusalBanner } from './RefusalBanner'
import {
  useDirectory,
  useSpeakerStats,
  type CityCount,
  type DirectoryFilter,
  type MeetingFormat,
  type SpeakerSummary,
} from './schoolData'
import { SpeakerCard, SpeakerRow } from './SpeakerCard'
import { FILTER_SECTORS, sectorName } from './sectorStyle'

const MY_ZONE = 'ma-zone'
const ALL_ZONES = 'toutes'
const REFUSAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

type SectorChoice = Sector | 'TOUS'
type FormatChoice = MeetingFormat | 'TOUS'

const FORMAT_LABEL: Record<FormatChoice, string> = { TOUS: 'Tous', IN_PERSON: 'En classe', ONLINE: 'En ligne' }

function speakersCount(count: number): string {
  return `${count} intervenant${count > 1 ? 's' : ''}`
}

/** Refus le plus récent par l'intervenant, datant de 14 jours au plus. */
function latestRefusal(meetings: readonly SchoolMeeting[], now: Date): SchoolMeeting | null {
  let latest: { meeting: SchoolMeeting; at: number } | null = null
  for (const meeting of meetings) {
    if (meeting.status !== 'REFUSED') continue
    const at = parseIso(meeting.refusedAt)?.getTime()
    if (meeting.closedBy !== 'SPEAKER' || at === undefined || now.getTime() - at > REFUSAL_WINDOW_MS) continue
    if (latest === null || at > latest.at) latest = { meeting, at }
  }
  return latest?.meeting ?? null
}

function SpeakerGrid({ speakers, showCity }: { speakers: readonly SpeakerSummary[]; showCity?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {speakers.map((speaker) => (
        <SpeakerCard key={speaker.id} speaker={speaker} showCity={showCity} />
      ))}
    </div>
  )
}

interface SectionProps {
  title: string
  filter: DirectoryFilter
  exclude?: (speaker: SpeakerSummary) => boolean
  showCity?: boolean
  emptyText: string
  /** Lignes compactes sur mobile (maquette : « Autres zones · en ligne »). */
  compactOnMobile?: boolean
}

function DirectorySection({ title, filter, exclude, showCity, emptyText, compactOnMobile = false }: SectionProps) {
  const directory = useDirectory(filter)
  const speakers = (directory.data?.items ?? []).filter((speaker) => !exclude?.(speaker))
  const headingId = `section-${normalizeName(title).replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-xl uppercase text-ink lg:text-2xl">
        {title.split(' · ')[0]}{' '}
        <span className="font-sans text-[13px] font-extrabold normal-case text-muted lg:text-[15px]">
          {title.includes(' · ')
            ? `· ${directory.data ? title.split(' · ')[1]?.replace('{n}', speakersCount(speakers.length)) : '…'}`
            : null}
        </span>
      </h2>
      {directory.isPending ? (
        <div className="flex justify-center py-6 text-terra">
          <Spinner label="Chargement des intervenants…" size="lg" />
        </div>
      ) : directory.isError ? (
        <ErrorState
          message={errorMessage(directory.error)}
          onRetry={() => void directory.refetch()}
          retrying={directory.isFetching}
        />
      ) : speakers.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <>
          {directory.data.truncated && (
            <Alert tone="warning">Beaucoup d'intervenants correspondent : affinez la recherche pour tous les voir.</Alert>
          )}
          {compactOnMobile ? (
            <>
              <div className="hidden lg:block">
                <SpeakerGrid speakers={speakers} showCity={showCity} />
              </div>
              <ul aria-label={`${title.split(' · ')[0]} (liste compacte)`} className="flex flex-col gap-2.5 lg:hidden">
                {speakers.map((speaker) => (
                  <SpeakerRow key={speaker.id} speaker={speaker} />
                ))}
              </ul>
            </>
          ) : (
            <SpeakerGrid speakers={speakers} showCity={showCity} />
          )}
        </>
      )}
    </section>
  )
}

type Sheet = 'zone' | 'secteur' | 'format' | null

export function SpeakersPage() {
  const user = useCurrentUser()
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const stats = useSpeakerStats()
  const meetings = useSchoolMeetings()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [selectedCity, setSelectedCity] = useState<CityCount | null>(null)

  const school = user.details?.kind === 'school' ? user.details : null
  const myCity = school?.city ?? ''
  const myCountry = school?.country ?? ''
  const zoneParam = params.get('zone') ?? MY_ZONE
  const zone = zoneParam === MY_ZONE && !myCity ? ALL_ZONES : zoneParam
  const sector = SECTORS.find((value) => value === params.get('secteur'))
  const format = (['IN_PERSON', 'ONLINE'] as const).find((value) => value === params.get('format'))
  const q = params.get('q')?.trim() || undefined
  const [search, setSearch] = useState(q ?? '')

  const byCity = stats.data?.byCity ?? []
  const otherCities = byCity.filter((entry) => !sameName(entry.city, myCity))
  const myCityEntry = byCity.find((entry) => sameName(entry.city, myCity)) ?? (myCity ? { city: myCity, country: myCountry, count: 0 } : null)
  const panelCity = selectedCity ?? myCityEntry ?? byCity[0] ?? null
  const refusal = latestRefusal(meetings.data?.items ?? [], now)

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    update({ q: search.trim() || null })
  }

  const common: DirectoryFilter = {
    ...(sector ? { sector } : {}),
    ...(q ? { q } : {}),
  }
  const isMine = (speaker: SpeakerSummary) =>
    sameName(speaker.city, myCity) && (!myCountry || !speaker.country || sameName(speaker.country, myCountry))
  const zoneCity = zone === MY_ZONE || zone === ALL_ZONES ? null : byCity.find((entry) => sameName(entry.city, zone))
  const zoneLabel =
    zone === MY_ZONE ? `${myCity} (ma zone)` : zone === ALL_ZONES ? 'Toutes les zones' : (zoneCity?.city ?? zone)
  const sectorValue: SectorChoice = sector ?? 'TOUS'
  const formatValue: FormatChoice = format ?? 'TOUS'

  const zoneOptions = [
    ...(myCity ? [{ value: MY_ZONE, label: `${myCity} (ma zone)` }] : []),
    { value: ALL_ZONES, label: 'Toutes les zones' },
    ...otherCities.map((entry) => ({ value: entry.city, label: entry.city })),
  ]
  const sectorOptions: { value: SectorChoice; label: string }[] = [
    { value: 'TOUS', label: 'Tous' },
    ...FILTER_SECTORS.map((value) => ({ value, label: sectorName(value) })),
  ]
  const formatOptions: { value: FormatChoice; label: string }[] = [
    { value: 'TOUS', label: 'Tous' },
    { value: 'IN_PERSON', label: 'En classe' },
    { value: 'ONLINE', label: 'En ligne' },
  ]

  const setSector = (value: SectorChoice) => update({ secteur: value === 'TOUS' ? null : value })
  const setFormat = (value: FormatChoice) => update({ format: value === 'TOUS' ? null : value })
  const setZone = (value: string) => update({ zone: value === MY_ZONE ? null : value })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <PageTitle
          kicker="Tableau de bord"
          mobileKicker={[school?.schoolName, myCity].filter(Boolean).join(' · ')}
          title="Intervenants disponibles"
          subtitle="Tous validés par la Fondation M. Ceux de votre zone apparaissent en premier."
        />
        <form
          role="search"
          onSubmit={submitSearch}
          className="flex h-12 items-center gap-2 rounded-[14px] border-2 border-line bg-surface px-3.5 text-muted focus-within:border-terra lg:w-80"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" className="size-[18px] shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            aria-label="Rechercher un intervenant"
            placeholder="Métier, compétence, nom…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:font-semibold placeholder:text-muted lg:text-sm"
          />
          <button type="submit" className="sr-only">
            Rechercher
          </button>
        </form>
      </header>

      {refusal !== null && <RefusalBanner meeting={refusal} />}

      <section aria-label="Filtres" className="hidden flex-wrap items-end gap-x-6 gap-y-4 rounded-[20px] bg-surface p-[18px] md:flex">
        <label className="flex flex-col gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-muted">
          Zone
          <Select
            value={zone}
            onChange={(event) => setZone(event.target.value)}
            className="h-11 min-w-52 border-indigo font-extrabold normal-case tracking-normal"
          >
            {zoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex flex-col gap-1.5">
          <span aria-hidden="true" className="text-xs font-black uppercase tracking-[0.08em] text-muted">
            Secteur
          </span>
          <ChoiceGroup label="Secteur" value={sectorValue} onChange={setSector} options={sectorOptions} look="filter" />
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-muted">
          Format
          <Select
            className="h-11 font-bold normal-case tracking-normal"
            value={formatValue} onChange={(event) => setFormat(event.target.value === 'IN_PERSON' ? 'IN_PERSON' : event.target.value === 'ONLINE' ? 'ONLINE' : 'TOUS')}>
            {formatOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </section>

      {/* B8 — pastilles-filtres mobiles (40 px) ; la zone est mise en avant en indigo / crème. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:hidden">
        <button
          type="button"
          onClick={() => setSheet('zone')}
          className="inline-flex min-h-10 shrink-0 items-center rounded-pill border-2 border-indigo bg-indigo px-3 text-[13px] font-black text-cream"
        >
          {zoneLabel}
        </button>
        <button
          type="button"
          onClick={() => setSheet('secteur')}
          className="inline-flex min-h-10 shrink-0 items-center rounded-pill border-2 border-line bg-surface px-3 text-[13px] font-extrabold text-ink"
        >
          Secteur{sector ? ` · ${sectorName(sector)}` : ''}
        </button>
        <button
          type="button"
          onClick={() => setSheet('format')}
          className="inline-flex min-h-10 shrink-0 items-center rounded-pill border-2 border-line bg-surface px-3 text-[13px] font-extrabold text-ink"
        >
          Format{format ? ` · ${FORMAT_LABEL[format]}` : ''}
        </button>
      </div>

      <Modal
        open={sheet !== null}
        title={sheet === 'zone' ? 'Zone' : sheet === 'secteur' ? 'Secteur' : 'Format'}
        onClose={() => setSheet(null)}
      >
        <ul className="flex flex-col gap-2">
          {(sheet === 'zone' ? zoneOptions : sheet === 'secteur' ? sectorOptions : formatOptions).map((option) => {
            const current = sheet === 'zone' ? zone : sheet === 'secteur' ? sectorValue : formatValue
            return (
              <li key={option.value}>
                <button
                  type="button"
                  aria-pressed={option.value === current}
                  onClick={() => {
                    if (sheet === 'zone') setZone(option.value)
                    else if (sheet === 'secteur') setSector(sectorOptions.find((entry) => entry.value === option.value)?.value ?? 'TOUS')
                    else setFormat(formatOptions.find((entry) => entry.value === option.value)?.value ?? 'TOUS')
                    setSheet(null)
                  }}
                  className={
                    option.value === current
                      ? 'flex min-h-touch w-full items-center rounded-button bg-ink px-4 font-extrabold text-cream'
                      : 'flex min-h-touch w-full items-center rounded-button border-2 border-line px-4 font-extrabold text-ink'
                  }
                >
                  {option.label}
                </button>
              </li>
            )
          })}
        </ul>
      </Modal>

      {stats.isError ? (
        <ErrorState message={errorMessage(stats.error)} onRetry={() => void stats.refetch()} retrying={stats.isFetching} />
      ) : stats.data ? (
        <>
          <NetworkSection
            byCity={byCity}
            total={stats.data.total}
            myCity={myCity}
            myCountry={myCountry}
            selected={panelCity}
            onSelect={setSelectedCity}
          />
        </>
      ) : null}

      {zone === MY_ZONE ? (
        <>
          <DirectorySection
            title={`À ${myCity} · {n}`}
            filter={{ ...common, city: myCity, ...(myCountry ? { country: myCountry } : {}), ...(format ? { format } : {}) }}
            emptyText={`Aucun intervenant à ${myCity} pour ces critères.`}
          />
          {format !== 'IN_PERSON' && (
            <DirectorySection
              title="Autres zones · disponibles en ligne"
              filter={{ ...common, format: 'ONLINE' }}
              exclude={isMine}
              showCity
              compactOnMobile
              emptyText="Aucun autre intervenant disponible en ligne pour ces critères."
            />
          )}
        </>
      ) : zone === ALL_ZONES ? (
        <DirectorySection
          title="Toutes les zones · {n}"
          filter={{ ...common, ...(format ? { format } : {}) }}
          showCity
          emptyText="Aucun intervenant ne correspond à ces critères."
        />
      ) : (
        <DirectorySection
          title={`À ${zoneCity?.city ?? zone} · {n}`}
          filter={{
            ...common,
            city: zoneCity?.city ?? zone,
            ...(zoneCity?.country ? { country: zoneCity.country } : {}),
            ...(format ? { format } : {}),
          }}
          emptyText={`Aucun intervenant à ${zoneCity?.city ?? zone} pour ces critères.`}
        />
      )}
    </div>
  )
}
