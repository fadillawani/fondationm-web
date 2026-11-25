import { SECTOR_LABELS, type Sector } from '../../lib/referenceData'

/** Couleurs par secteur (maquette) : avatar d'initiales et libellé. Contrastes : décision 37. */
interface SectorStyle {
  avatar: string
  label: string
}

const STYLES: Partial<Record<Sector, SectorStyle>> = {
  AGRICULTURE: { avatar: 'bg-green text-cream', label: 'text-green' },
  FINANCE: { avatar: 'bg-yellow text-ink', label: 'text-[#8A5F00]' },
  CRAFTS: { avatar: 'bg-orange text-ink', label: 'text-[#A34E00]' },
  HEALTH: { avatar: 'bg-red text-white', label: 'text-red' },
  DIGITAL: { avatar: 'bg-indigo text-cream', label: 'text-indigo' },
  LAW: { avatar: 'bg-[#9DAA3C] text-ink', label: 'text-[#5C6620]' },
}

/** Secteurs sans couleur dans la maquette : encre et crème. */
const DEFAULT_STYLE: SectorStyle = { avatar: 'bg-ink text-cream', label: 'text-ink' }

export function sectorStyle(sector: Sector | null): SectorStyle {
  return (sector && STYLES[sector]) ?? DEFAULT_STYLE
}

export function sectorName(sector: Sector | null): string {
  return sector ? SECTOR_LABELS[sector].name : 'Secteur non précisé'
}

/** Pastilles de filtre de la maquette, dans son ordre. */
export const FILTER_SECTORS = ['HEALTH', 'DIGITAL', 'FINANCE', 'AGRICULTURE', 'CRAFTS', 'LAW'] as const satisfies readonly Sector[]
