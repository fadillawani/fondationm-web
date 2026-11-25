/**
 * Pays et villes des inscriptions (maquettes W1-E1, W2-E1), une seule source pour l'orthographe.
 * La carte du réseau (`pages/school/mapCities.ts`) positionne 8 de ces villes.
 */

/** Pays de la maquette W1-E1-pc, dans son ordre. */
export const COUNTRIES = [
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

export const DEFAULT_COUNTRY = 'Sénégal'

/**
 * Villes du Sénégal (« Zone (ville) » en liste fermée) : celles de la maquette (Dakar, Saint-Louis, Thiès,
 * Kaolack, Ziguinchor), puis celles de la carte, puis les autres chefs-lieux (liste validée).
 */
export const SENEGAL_CITIES = [
  'Dakar',
  'Saint-Louis',
  'Thiès',
  'Kaolack',
  'Ziguinchor',
  'Touba',
  'Louga',
  'Tambacounda',
  'Mbour',
  'Diourbel',
  'Fatick',
  'Kaffrine',
  'Kédougou',
  'Kolda',
  'Matam',
  'Sédhiou',
] as const

/** Pour un autre pays, la maquette ne donne aucune ville : « Zone (ville) » reste un champ libre. */
export function hasCityList(country: string): boolean {
  return country === DEFAULT_COUNTRY
}
