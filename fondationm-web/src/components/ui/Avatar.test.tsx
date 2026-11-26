import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SECURE_URL } from '../../test/fakeXhr'
import { Initials } from './Initials'

const SIZE = 'size-[46px]'

describe('Avatar commun (F13, décision 130)', () => {
  it('montre la photo d’un intervenant en object-cover, à la taille des initiales', () => {
    const { container } = render(<Initials name="Awa Ndiaye" tone="speaker" size="list" photoUrl={SECURE_URL} />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', SECURE_URL)
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveClass('object-cover', 'size-full')
    expect(img?.parentElement).toHaveClass(SIZE, 'overflow-hidden')
    expect(screen.queryByText('AN')).not.toBeInTheDocument()
  })

  it('montre le logo d’une école en object-contain sur fond blanc', () => {
    const { container } = render(<Initials name="Lycée Seydina Limamou" tone="school" photoUrl={SECURE_URL} />)
    expect(container.querySelector('img')).toHaveClass('object-contain')
    expect(container.querySelector('img')?.parentElement).toHaveClass('bg-white', 'size-11')
  })

  it.each([
    ['absente', undefined],
    ['nulle', null],
    ['hors Cloudinary', 'https://exemple.test/photo.jpg'],
    ['en http', SECURE_URL.replace('https:', 'http:')],
  ])('garde les initiales quand l’adresse est %s', (_label, photoUrl) => {
    const { container } = render(<Initials name="Awa Ndiaye" tone="speaker" size="list" photoUrl={photoUrl} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('AN')).toHaveClass(SIZE)
  })

  it('revient aux initiales, même taille, si l’image ne se charge pas', () => {
    const { container } = render(<Initials name="Awa Ndiaye" tone="speaker" size="list" photoUrl={SECURE_URL} />)
    fireEvent.error(container.querySelector('img') as HTMLImageElement)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('AN')).toHaveClass(SIZE)
  })
})
