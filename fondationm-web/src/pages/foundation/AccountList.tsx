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
                'flex min-h-touch w-full items-center gap-3 rounded-[18px] border-2 bg-surface px-4 py-3.5 text-left transition-colors',
                selected ? 'border-ink' : 'border-transparent hover:border-line',
              )}
            >
              <Initials name={account.name} tone={account.role === 'SCHOOL' ? 'school' : 'speaker'} size="list" photoUrl={account.details?.photoUrl} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-display text-lg leading-tight text-ink">{account.name}</span>
                {context && <span className="truncate text-[13px] font-bold text-muted">{context}</span>}
              </span>
              <Badge tone={status.tone} size="sm">
                {status.label}
              </Badge>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
