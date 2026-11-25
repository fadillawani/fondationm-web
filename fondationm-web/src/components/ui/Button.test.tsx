import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('déclenche onClick et n’envoie pas de formulaire par défaut', async () => {
    const onClick = vi.fn<() => void>()
    render(<Button onClick={onClick}>Valider</Button>)

    const button = screen.getByRole('button', { name: 'Valider' })
    await userEvent.click(button)

    expect(onClick).toHaveBeenCalledOnce()
    expect(button).toHaveAttribute('type', 'button')
  })

  it('se désactive et signale le chargement', async () => {
    const onClick = vi.fn<() => void>()
    render(
      <Button loading onClick={onClick}>
        Valider
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Valider' })
    await userEvent.click(button)

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(onClick).not.toHaveBeenCalled()
  })
})
