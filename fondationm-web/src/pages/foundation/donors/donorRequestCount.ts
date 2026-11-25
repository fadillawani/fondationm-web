import { useDonorRequests } from './donorsData'

/** Pastille « Requêtes donateurs » : requêtes OPEN de la requête partagée avec la page. */
export function useOpenDonorRequestCount(enabled: boolean): number | undefined {
  const requests = useDonorRequests(enabled)
  return requests.data?.items.filter((request) => request.status === 'OPEN').length
}
