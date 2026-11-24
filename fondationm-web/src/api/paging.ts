import { invalidResponseError } from './errors'
import { asRecord, integer, recordList } from './wire'

/** Taille demandée ; le serveur peut la plafonner (on suit alors le `totalPages` qu'il renvoie). */
export const FETCH_PAGE_SIZE = 100
/** Limite de sécurité du parcours des pages. */
export const MAX_PAGES = 25

export interface Collection<T> {
  items: T[]
  /** true si la limite de MAX_PAGES a été atteinte avant la dernière page. */
  truncated: boolean
}

/** Parcourt toutes les pages d'une liste paginée (au plus MAX_PAGES). */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<unknown>,
  readItem: (value: unknown) => T | null,
): Promise<Collection<T>> {
  const items: T[] = []
  let page = 0
  let totalPages = 1
  while (page < totalPages && page < MAX_PAGES) {
    const record = asRecord(await fetchPage(page))
    if (record === null) throw invalidResponseError()
    const content = recordList(record, 'content')
    for (const entry of content) {
      const item = readItem(entry)
      if (item !== null) items.push(item)
    }
    totalPages = integer(record, 'totalPages') ?? (content.length === 0 ? 0 : page + 1)
    page += 1
  }
  return { items, truncated: page < totalPages }
}
