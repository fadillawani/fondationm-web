import { useId, useState, type KeyboardEvent, type Ref } from 'react'
import { Button } from '../../components/ui/Button'
import { ChipToggle } from '../../components/ui/ChipToggle'
import { Input } from '../../components/ui/Input'
import { SUGGESTED_SKILLS } from '../../lib/referenceData'
import { SKILLS_MAX, SKILL_MAX_LENGTH } from './schemas'

interface SkillPickerProps {
  value: string[]
  onChange: (skills: string[]) => void
  error?: string
  inputRef?: Ref<HTMLInputElement>
}

export function SkillPicker({ value, onChange, error, inputRef }: SkillPickerProps) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const [draftError, setDraftError] = useState<string | null>(null)
  const custom = value.filter((skill) => !SUGGESTED_SKILLS.some((suggested) => suggested === skill))
  const chips = [...SUGGESTED_SKILLS, ...custom]

  const toggle = (skill: string) => {
    if (value.includes(skill)) {
      onChange(value.filter((selected) => selected !== skill))
    } else if (value.length >= SKILLS_MAX) {
      setDraftError(`${SKILLS_MAX} compétences maximum.`)
    } else {
      onChange([...value, skill])
    }
  }

  const addDraft = () => {
    const skill = draft.trim()
    if (!skill) return setDraftError("Écrivez une compétence avant de l'ajouter.")
    if (skill.length > SKILL_MAX_LENGTH) return setDraftError(`${SKILL_MAX_LENGTH} caractères maximum.`)
    const existing = chips.find((chip) => chip.toLowerCase() === skill.toLowerCase())
    if (existing === undefined || !value.includes(existing)) {
      if (value.length >= SKILLS_MAX) return setDraftError(`${SKILLS_MAX} compétences maximum.`)
      onChange([...value, existing ?? skill])
    }
    setDraft('')
    setDraftError(null)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addDraft()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-labelledby={`${id}-intro`}
        aria-describedby={error ? `${id}-erreur` : undefined}
        className="flex flex-col gap-3"
      >
        <p id={`${id}-intro`} className="text-sm font-semibold text-muted">
          Choisissez vos compétences. Les écoles les voient sur votre profil.
        </p>
        <div className="flex flex-wrap gap-2">
          {chips.map((skill) => (
            <ChipToggle key={skill} label={skill} pressed={value.includes(skill)} onToggle={() => toggle(skill)} />
          ))}
        </div>
      </div>
      {error && (
        <p id={`${id}-erreur`} className="text-xs font-bold text-red">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-ajout`} className="text-[13px] font-extrabold text-ink">
          Ajouter une autre compétence
        </label>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id={`${id}-ajout`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            aria-invalid={draftError !== null}
            aria-describedby={draftError ? `${id}-ajout-erreur` : undefined}
            placeholder="Ex. : Mécanique auto"
          />
          <Button variant="secondary" size="md" onClick={addDraft} className="shrink-0">
            Ajouter
          </Button>
        </div>
        {draftError && (
          <p id={`${id}-ajout-erreur`} className="text-xs font-bold text-red">
            {draftError}
          </p>
        )}
      </div>
    </div>
  )
}
