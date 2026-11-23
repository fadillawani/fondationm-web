import type { components } from '../api/schema'

export type SchoolType = NonNullable<components['schemas']['SchoolProfileResponse']['schoolType']>
export type Sector = NonNullable<components['schemas']['SpeakerProfileResponse']['sector']>

export const SCHOOL_TYPES = ['HIGH_SCHOOL', 'MIDDLE_SCHOOL', 'TRAINING_CENTER'] as const satisfies readonly SchoolType[]

export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  HIGH_SCHOOL: 'Lycée',
  MIDDLE_SCHOOL: 'Collège (CEM)',
  TRAINING_CENTER: 'Centre de formation',
}

export const SECTORS = [
  'DIGITAL',
  'HEALTH',
  'FINANCE',
  'AGRICULTURE',
  'CRAFTS',
  'LAW',
  'CONSTRUCTION_INDUSTRY',
  'COMMERCE_ENTREPRENEURSHIP',
  'EDUCATION_SOCIAL',
  'ARTS_MEDIA',
  'OTHER',
] as const satisfies readonly Sector[]

export const SECTOR_LABELS: Record<Sector, { name: string; detail?: string }> = {
  DIGITAL: { name: 'Numérique', detail: 'informatique, télécoms, data' },
  HEALTH: { name: 'Santé', detail: 'médecine, pharmacie, soins' },
  FINANCE: { name: 'Finance', detail: 'banque, assurance, comptabilité' },
  AGRICULTURE: { name: 'Agriculture', detail: 'agronomie, élevage, pêche' },
  CRAFTS: { name: 'Artisanat', detail: 'couture, cuir, menuiserie' },
  LAW: { name: 'Droit', detail: 'avocat, juriste, notariat' },
  CONSTRUCTION_INDUSTRY: { name: 'BTP et industrie' },
  COMMERCE_ENTREPRENEURSHIP: { name: 'Commerce et entrepreneuriat' },
  EDUCATION_SOCIAL: { name: 'Éducation et social' },
  ARTS_MEDIA: { name: 'Arts, culture et médias' },
  OTHER: { name: 'Autre secteur' },
}

export function sectorOptionLabel(sector: Sector): string {
  const { name, detail } = SECTOR_LABELS[sector]
  return detail ? `${name} — ${detail}` : name
}

export const SUGGESTED_COUNTRIES = [
  'Sénégal',
  'Bénin',
  'Burkina Faso',
  "Côte d'Ivoire",
  'Gambie',
  'Guinée',
  'Mali',
  'Mauritanie',
  'Togo',
] as const

export const SUGGESTED_CITIES = ['Dakar', 'Saint-Louis', 'Thiès', 'Kaolack', 'Ziguinchor'] as const

export const SUGGESTED_SKILLS = [
  'Réseaux',
  'Télécoms',
  'Fibre optique',
  'Cybersécurité',
  'Gestion de projet',
  'Entrepreneuriat',
  'Orientation après le bac',
  "Études d'ingénieur",
] as const

export const CONTACT_EMAIL = 'contact@fondationm.sn'
