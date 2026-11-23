import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormField } from './FormField'
import { Input } from './Input'

describe('FormField', () => {
  it('relie le libellé et l’aide au champ', () => {
    render(
      <FormField label="Ville" hint="Ville de l’établissement">
        {(control) => <Input {...control} />}
      </FormField>,
    )

    const input = screen.getByLabelText('Ville')
    expect(input).toHaveAccessibleDescription('Ville de l’établissement')
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('affiche l’erreur et marque le champ invalide', () => {
    render(
      <FormField label="Ville" hint="Ville de l’établissement" error="Indiquez une ville." required>
        {(control) => <Input {...control} />}
      </FormField>,
    )

    const input = screen.getByLabelText(/Ville/)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).toHaveAccessibleDescription('Ville de l’établissement Indiquez une ville.')
  })
})
