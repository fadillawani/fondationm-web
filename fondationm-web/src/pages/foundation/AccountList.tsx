import { Badge } from '../../components/ui/Badge'
import { Initials } from '../../components/ui/Initials'
import { cn } from '../../lib/cn'
import type { Account } from './accounts'
import { STATUS_BADGE, contextLine } from './accountText'

interface AccountListProps {
  label: string
  accounts: Account[]
  selectedId: string | null
  onSelect: (account: Account) => void
}

export function AccountList({ label, accounts, selectedId, onSelect }: AccountListProps) {
  return (
    <ul aria-label={label} className="flex flex-col gap-2">
      {accounts.map((account) => {
        const selected = account.id === selectedId
        const status = STATUS_BADGE[account.status]
        const context = contextLine(account)
        return (
          <li key={account.id}>
            <button
              type="button"
              aria-current={selected || undefined}
              onClick={() => onSelect(account)}
              className={cn(
                'flex min-h-touch w-full items-center gap-3 rounded-block border-2 bg-surface p-3 text-left transition-colors',
                selected ? 'border-ink' : 'border-line hover:border-muted',
              )}
            >
              <Initials name={account.name} tone={account.role === 'SCHOOL' ? 'school' : 'speaker'} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-extrabold text-ink">{account.name}</span>
                {context && <span className="truncate text-sm font-semibold text-muted">{context}</span>}
              </span>
              <Badge tone={status.tone}>{status.label}</Badge>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
