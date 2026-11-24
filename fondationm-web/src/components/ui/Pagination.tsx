import { Button } from './Button'

interface PaginationProps {
  /** Page courante, à partir de 0 (comme le contrat). */
  page: number
  totalPages: number
  onChange: (page: number) => void
  label?: string
}

export function Pagination({ page, totalPages, onChange, label = 'Pagination' }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-2">
      <Button variant="outline" size="md" disabled={page <= 0} onClick={() => onChange(page - 1)}>
        Précédent
      </Button>
      <p className="text-sm font-extrabold text-muted" aria-live="polite">
        Page {page + 1} sur {totalPages}
      </p>
      <Button variant="outline" size="md" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>
        Suivant
      </Button>
    </nav>
  )
}
