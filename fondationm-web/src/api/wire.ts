/*
 * Lecture défensive des réponses du serveur. Le backend envoie des `null` explicites que le contrat
 * déclare seulement facultatifs : toute valeur null, absente ou d'un type inattendu est traitée comme
 * absente.
 */
export type WireRecord = Record<string, unknown>

export function asRecord(value: unknown): WireRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as WireRecord) : null
}

export function text(record: WireRecord, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' && value !== '' ? value : null
}

export function integer(record: WireRecord, key: string): number | null {
  const value = record[key]
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

export function oneOf<T extends string>(allowed: readonly T[], value: string | null): T | null {
  return allowed.find((item) => item === value) ?? null
}

export function textList(record: WireRecord, key: string): string[] {
  const value = record[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item !== '') : []
}

export function recordList(record: WireRecord, key: string): WireRecord[] {
  const value = record[key]
  if (!Array.isArray(value)) return []
  return value.flatMap((item: unknown): WireRecord[] => {
    const entry = asRecord(item)
    return entry === null ? [] : [entry]
  })
}
