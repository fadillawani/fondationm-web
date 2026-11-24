import type { KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { MAP_CITIES_NORTH_TO_SOUTH, circleRadius, countFontSize, hitArea, polygonPath, type MapCity } from './mapCities'

interface NetworkMapProps {
  /** Nombre d'intervenants par ville de la carte (clé : nom normalisé), sous les filtres actifs. */
  counts: ReadonlyMap<string, number>
  /** Ville choisie (clé normalisée), ou null. */
  selected: string | null
  /** Ville de l'établissement (clé normalisée), repérée même si elle n'est pas choisie. */
  mine: string | null
  /** Libellé global du groupe (« Carte du Sénégal : 23 intervenants à Dakar, … »). */
  label: string
  onSelect: (city: MapCity) => void
}

const SENEGAL =
  '66,42 78,18 120,18 162,9 198,12 228,42 258,66 282,90 312,114 342,138 360,174 372,210 372,264 336,264 282,258 234,252 186,252 144,246 114,261 54,267 51,252 48,222 51,192 48,174 36,150 6,125 30,114 42,90 60,60'
const GAMBIA = '48,221 49,193 126,192 168,189 228,195 228,207 168,203 126,210'

const HIT_PATHS = new Map(MAP_CITIES_NORTH_TO_SOUTH.map((city) => [city.key, polygonPath(hitArea(city))]))

function cityLabel(city: MapCity, count: number, mine: boolean): string {
  return `${city.name}, ${count} intervenant${count > 1 ? 's' : ''}${mine ? ', votre ville' : ''}`
}

interface CityControlProps {
  city: MapCity
  count: number
  selected: boolean
  mine: boolean
  onSelect: (city: MapCity) => void
}

/**
 * Une ville de la carte, vrai bouton (Carte-Q1) : clic, Entrée ou Espace ; survol (anneau indigo), focus clavier
 * (anneau encre), ville choisie (terracotta + anneau). Une ville à 0 est en pointillés, sans opacité (contraste).
 */
function CityControl({ city, count, selected, mine, onSelect }: CityControlProps) {
  const r = circleRadius(count)
  const empty = count === 0

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(city)
    }
  }

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={cityLabel(city, count, mine)}
      aria-pressed={selected}
      onClick={() => onSelect(city)}
      onKeyDown={onKeyDown}
      className="group cursor-pointer outline-none"
    >
      <path d={HIT_PATHS.get(city.key)} fill="transparent" />
      {!selected && (
        <circle
          cx={city.cx}
          cy={city.cy}
          r={r + 5}
          fill="none"
          stroke="#2B337A"
          strokeWidth={2}
          className="invisible group-hover:visible"
        />
      )}
      <circle
        cx={city.cx}
        cy={city.cy}
        r={r + 8}
        fill="none"
        stroke="#1B1F3B"
        strokeWidth={3}
        className="invisible group-focus-visible:visible"
      />
      {selected && <circle cx={city.cx} cy={city.cy} r={r + 5} fill="none" stroke="#B8492A" strokeWidth={3} />}
      <circle
        cx={city.cx}
        cy={city.cy}
        r={r}
        fill={selected ? '#B8492A' : empty ? '#FFFFFF' : '#2B337A'}
        stroke={empty && !selected ? '#2B337A' : '#FFFFFF'}
        strokeWidth={2}
        strokeDasharray={empty && !selected ? '3 2' : undefined}
      />
      <text
        x={city.cx}
        y={city.cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={empty && !selected ? '#1B1F3B' : '#FFFFFF'}
        fontWeight={900}
        fontSize={countFontSize(r)}
      >
        {count}
      </text>
      {mine && (
        <path
          d={`M${city.cx},${city.cy - r - 17} l5,5 l-5,5 l-5,-5 Z`}
          fill="#B8492A"
          stroke="#FFFFFF"
          strokeWidth={1}
        />
      )}
      <text
        x={city.lx}
        y={city.ly}
        textAnchor={city.anchor}
        fill="#1B1F3B"
        fontWeight={city.major ? 900 : 800}
        className={city.major ? 'text-[15px] md:text-[12px]' : 'text-[14px] md:text-[11px]'}
      >
        {city.name}
        {mine && (
          <tspan fill="#B8492A" fontWeight={900}>
            {' '}
            · vous
          </tspan>
        )}
      </text>
    </g>
  )
}

/**
 * Carte schématique du Sénégal de la maquette (viewBox et tracés repris tels quels). Groupe étiqueté : le
 * libellé global ne masque pas les contrôles des villes, parcourus du nord au sud.
 */
export function NetworkMap({ counts, selected, mine, label, onSelect }: NetworkMapProps) {
  return (
    <svg viewBox="-24 -6 410 284" role="group" aria-label={label} className={cn('h-auto w-full')}>
      <g aria-hidden="true">
        <polygon points={SENEGAL} fill="#F7F3EA" stroke="#B8AE98" strokeWidth={2} strokeLinejoin="round" />
        <polygon points={GAMBIA} fill="#E6DECB" stroke="#B8AE98" strokeWidth={1.5} strokeLinejoin="round" />
        <text x={150} y={203} fontSize={10} fontWeight={700} fill="#4A4A57">
          GAMBIE
        </text>
        <text x={250} y={140} fontSize={13} fontWeight={900} fill="#B8AE98" letterSpacing={3}>
          SÉNÉGAL
        </text>
        <text x={-18} y={40} fontSize={10} fontWeight={700} fill="#4A5294">
          Océan
        </text>
        <text x={-18} y={52} fontSize={10} fontWeight={700} fill="#4A5294">
          Atlantique
        </text>
      </g>
      {MAP_CITIES_NORTH_TO_SOUTH.map((city) => (
        <CityControl
          key={city.key}
          city={city}
          count={counts.get(city.key) ?? 0}
          selected={selected === city.key}
          mine={mine === city.key}
          onSelect={onSelect}
        />
      ))}
    </svg>
  )
}
