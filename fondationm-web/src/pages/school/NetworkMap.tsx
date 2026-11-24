import { cn } from '../../lib/cn'
import { MAP_CITIES, circleRadius, countFontSize, type MapCity } from './mapCities'

interface NetworkMapProps {
  /** Nombre d'intervenants par ville de la carte (clé : nom normalisé). */
  counts: ReadonlyMap<string, number>
  selected: string | null
  label: string
}

const SENEGAL =
  '66,42 78,18 120,18 162,9 198,12 228,42 258,66 282,90 312,114 342,138 360,174 372,210 372,264 336,264 282,258 234,252 186,252 144,246 114,261 54,267 51,252 48,222 51,192 48,174 36,150 6,125 30,114 42,90 60,60'
const GAMBIA = '48,221 49,193 126,192 168,189 228,195 228,207 168,203 126,210'

function CityMark({ city, count, selected }: { city: MapCity; count: number; selected: boolean }) {
  const r = circleRadius(count)
  return (
    <g>
      {selected && <circle cx={city.cx} cy={city.cy} r={r + 5} fill="none" stroke="#B8492A" strokeWidth={3} />}
      <circle cx={city.cx} cy={city.cy} r={r} fill={selected ? '#B8492A' : '#2B337A'} stroke="#FFFFFF" strokeWidth={2} />
      <text
        x={city.cx}
        y={city.cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#FFFFFF"
        fontWeight={900}
        fontSize={countFontSize(r)}
      >
        {count}
      </text>
      <text
        x={city.lx}
        y={city.ly}
        textAnchor={city.anchor}
        fill="#1B1F3B"
        fontWeight={city.major ? 900 : 800}
        className={city.major ? 'text-[15px] md:text-[12px]' : 'text-[14px] md:text-[11px]'}
      >
        {city.name}
      </text>
    </g>
  )
}

/** Carte schématique du Sénégal de la maquette (viewBox et tracés repris tels quels). */
export function NetworkMap({ counts, selected, label }: NetworkMapProps) {
  return (
    <svg viewBox="-24 -6 410 284" role="img" aria-label={label} className={cn('h-auto w-full')}>
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
      {MAP_CITIES.map((city) => {
        const count = counts.get(city.key) ?? 0
        if (count === 0) return null
        return <CityMark key={city.key} city={city} count={count} selected={selected === city.key} />
      })}
    </svg>
  )
}
