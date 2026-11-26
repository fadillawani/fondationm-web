import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { donorMe } from '../../test/donorFixtures'
import { FakeXhr } from '../../test/fakeXhr'
import { foundationMe, jsonResponse, makeMe, mockApi, renderApp, speakerMe } from '../../test/helpers'
import { studentMe } from '../../test/studentFixtures'
import indexHtml from '../../../index.html?raw'
import { FOOTER_TEXT, HERO_TEXT, PROJECT_TEXT, SITE_TITLE } from './homeContent'

beforeEach(() => FakeXhr.install())
afterEach(() => {
  vi.unstubAllGlobals()
})

function card(title: string) {
  const heading = screen.getByRole('heading', { level: 3, name: title })
  return within(heading.closest('li') as HTMLElement)
}

describe('Vitrine publique « / » (F14)', () => {
  it('s’affiche sans jeton, sans aucun appel réseau, avec ses repères et un seul h1', async () => {
    const fetchMock = mockApi({})
    const { router } = renderApp('/')

    expect(await screen.findByRole('heading', { level: 1, name: HERO_TEXT })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('banner')).toHaveTextContent('Les Tisseurs de Destin')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenu')
    expect(screen.getByRole('contentinfo')).toHaveTextContent(`${FOOTER_TEXT}Fondation M`)
    expect(screen.getByRole('link', { name: 'Aller au contenu' })).toHaveAttribute('href', '#contenu')
    expect(screen.getByRole('heading', { level: 2, name: 'Le projet' })).toBeInTheDocument()
    expect(screen.getByText(PROJECT_TEXT)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Comment ça marche' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Pour qui ?' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Inscription',
      'Demande',
      'Rencontre',
      'Retour',
      'Établissement scolaire',
      'Intervenant',
      'Élève',
      'Mécène',
      'Équipe Fondation M',
    ])
    expect(fetchMock).not.toHaveBeenCalled()
    expect(FakeXhr.instances).toHaveLength(0)
    expect(screen.queryByText(/serveur se réveille/)).not.toBeInTheDocument()
    expect(document.title).toBe(SITE_TITLE)
  })

  it('n’annonce ni rencontre en ligne, ni chiffre, ni image : seulement des SVG décoratifs', async () => {
    mockApi({})
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })
    const container = document.body
    expect(container.textContent).not.toMatch(/en ligne|\d{2,}\s|%/)
    expect(container.querySelector('img')).toBeNull()
    const svgs = [...container.querySelectorAll('svg')]
    expect(svgs.length).toBeGreaterThan(0)
    for (const svg of svgs) expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('mène chaque lien vers sa page, sans inscription pour l’élève, le mécène et la Fondation', async () => {
    mockApi({})
    renderApp('/')
    const hero = within((await screen.findByRole('heading', { level: 1 })).closest('section') as HTMLElement)
    expect(hero.getByRole('link', { name: 'Inscrire mon établissement' })).toHaveAttribute('href', '/inscription/ecole')
    expect(hero.getByRole('link', { name: 'Partager mon expérience' })).toHaveAttribute('href', '/inscription/intervenant')

    const expected: [string, [string, string][]][] = [
      ['Établissement scolaire', [['Inscrire mon établissement', '/inscription/ecole'], ['Connexion établissement', '/connexion']]],
      ['Intervenant', [['Partager mon expérience', '/inscription/intervenant'], ['Connexion intervenant', '/connexion/intervenant']]],
      ['Élève', [['Connexion élève', '/connexion/eleve']]],
      ['Mécène', [['Connexion mécène', '/connexion/donateur']]],
      ['Équipe Fondation M', [['Connexion Fondation M', '/connexion/fondation']]],
    ]
    for (const [title, links] of expected) {
      const found = card(title).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])
      expect(found).toEqual(links)
    }
    expect(card('Élève').getByText(/Ton accès t'est remis par ton établissement\./)).toBeInTheDocument()
    expect(card('Mécène').getByText(/Votre accès vous est remis par la Fondation M\./)).toBeInTheDocument()
    expect(card('Équipe Fondation M').getByText(/Réservé à l’équipe de la Fondation M\./)).toBeInTheDocument()
  })

  it('ouvre le menu « Se connecter » à cinq espaces ; Échap le ferme et rend le focus', async () => {
    mockApi({})
    const { user, router } = renderApp('/')
    const button = await screen.findByRole('button', { name: 'Se connecter' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: 'Espaces de connexion' })).not.toBeInTheDocument()

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const menu = within(screen.getByRole('navigation', { name: 'Espaces de connexion' }))
    expect(menu.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Établissement', '/connexion'],
      ['Intervenant', '/connexion/intervenant'],
      ['Élève', '/connexion/eleve'],
      ['Mécène', '/connexion/donateur'],
      ['Équipe Fondation M', '/connexion/fondation'],
    ])

    await user.tab()
    await user.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()

    await user.click(button)
    fireEvent.mouseDown(screen.getByRole('main'))
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)
    await user.click(screen.getByRole('link', { name: 'Élève' }))
    expect(router.state.location.pathname).toBe('/connexion/eleve')
  })

  it.each([
    ['école', makeMe(), '/ecole'],
    ['intervenant', speakerMe, '/intervenant'],
    ['Fondation', foundationMe, '/fondation'],
    ['mécène', donorMe, '/donateur'],
    ['élève', studentMe, '/eleve'],
    ['compte en attente', makeMe({ status: 'PENDING' }), '/compte-en-attente'],
    ['mot de passe obligatoire', makeMe({ mustChangePassword: true }), '/mot-de-passe-obligatoire'],
  ])('envoie un compte connecté (%s) vers son espace, sans vitrine', async (_label, me, home) => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, me) })
    const { router } = renderApp('/', { token: true })
    await expect.poll(() => router.state.location.pathname.startsWith(home)).toBe(true)
    expect(screen.queryByRole('heading', { name: HERO_TEXT })).not.toBeInTheDocument()
  })

  it('« Revenir à l’accueil » de la page 404 mène un visiteur à la vitrine', async () => {
    mockApi({})
    const { user, router } = renderApp('/page-inconnue')
    await user.click(await screen.findByRole('link', { name: "Revenir à l'accueil" }))
    expect(await screen.findByRole('heading', { level: 1, name: HERO_TEXT })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('garde la connexion pour une page protégée sans jeton', async () => {
    mockApi({})
    const { router } = renderApp('/eleve')
    await expect.poll(() => router.state.location.pathname.startsWith('/connexion')).toBe(true)
    expect(screen.queryByRole('heading', { name: HERO_TEXT })).not.toBeInTheDocument()
  })
})

describe('index.html (F14)', () => {
  it('porte le titre, la description et les balises Open Graph sans image', () => {
    const html = indexHtml
    const description =
      'Les Tisseurs de Destin, un projet de la Fondation M : des professionnels bénévoles rencontrent des élèves et des étudiants pour leur transmettre leur savoir et leurs conseils.'
    expect(html).toContain(`<title>${SITE_TITLE}</title>`)
    expect(html).toContain(`<meta name="description" content="${description}" />`)
    expect(html).toContain('<meta property="og:type" content="website" />')
    expect(html).toContain('<meta property="og:locale" content="fr_FR" />')
    expect(html).toContain(`<meta property="og:title" content="${SITE_TITLE}" />`)
    expect(html).toContain(`<meta property="og:description" content="${description}" />`)
    expect(html).not.toContain('og:image')
  })
})

type Notify = (entries: { isIntersecting: boolean; target: Element }[]) => void

function stubMotion(reduce: boolean) {
  const observed: Element[] = []
  let notify: Notify | null = null
  class FakeObserver {
    constructor(callback: Notify) {
      notify = callback
    }
    observe(target: Element) {
      observed.push(target)
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query }))
  return { observed, show: (target: Element) => notify?.([{ isIntersecting: true, target }]) }
}

async function root() {
  return (await screen.findByRole('heading', { level: 1 })).closest('.vitrine') as HTMLElement
}

describe('Animations de la vitrine (F14, décision 147)', () => {
  it('met « Destin » en terracotta sans changer le texte lu de l’accroche', async () => {
    mockApi({})
    renderApp('/')
    const h1 = await screen.findByRole('heading', { level: 1, name: HERO_TEXT })
    expect(within(h1).getByText('Destin')).toHaveClass('text-terra')
  })

  it('ne masque rien sans IntersectionObserver (ni sans JavaScript d’animation)', async () => {
    mockApi({})
    renderApp('/')
    const element = await root()
    expect(element).not.toHaveClass('vitrine-anime')
    expect(element.querySelectorAll('[data-reveal]').length).toBeGreaterThan(0)
  })

  it('ne masque rien quand l’utilisateur réduit les animations', async () => {
    const { observed } = stubMotion(true)
    mockApi({})
    renderApp('/')
    expect(await root()).not.toHaveClass('vitrine-anime')
    expect(observed).toHaveLength(0)
  })

  it('fait apparaître chaque élément une seule fois, à son entrée à l’écran', async () => {
    const { observed, show } = stubMotion(false)
    mockApi({})
    renderApp('/')
    const element = await root()
    await expect.poll(() => element.classList.contains('vitrine-anime')).toBe(true)
    const targets = [...element.querySelectorAll('[data-reveal]')]
    expect(observed).toEqual(targets)
    expect(targets).toHaveLength(12)
    const [first, second] = targets as [Element, Element]
    show(first)
    expect(first).toHaveClass('is-visible')
    expect(second).not.toHaveClass('is-visible')
  })
})
