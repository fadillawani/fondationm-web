import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/helpers'
import {
  COMPLETED_PUBLISHED,
  COMPLETED_TO_WRITE,
  CONFIRMED,
  PENDING,
  REFUSED_BY_SPEAKER,
  setupMeetings,
} from '../../test/meetingsFixtures'
import { freezeNow } from '../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

async function calendar(month = 'Novembre 2026') {
  return within(await screen.findByRole('table', { name: `Calendrier de ${month}` }))
}

function detail() {
  return within(screen.getByRole('region', { name: 'Détail de la rencontre' }))
}

function decision(who: string): string | null {
  return detail().getByText(who).nextElementSibling?.textContent ?? null
}

function list(name: string) {
  return within(screen.getByRole('region', { name }))
}

describe('Mes rencontres', () => {
  it('active l’entrée « Mes rencontres » avec la pastille des rencontres à venir', async () => {
    setupMeetings()
    renderApp('/ecole/rencontres', { token: true })

    const [sidebar] = await screen.findAllByRole('navigation', { name: 'Navigation principale' })
    if (sidebar === undefined) throw new Error('Barre latérale absente')
    // À venir, PENDING ou CONFIRMED : la rencontre confirmée et la demande en attente.
    expect(await within(sidebar).findByRole('link', { name: 'Mes rencontres 2 en attente' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('heading', { name: 'Mes rencontres', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Mon planning')).toBeInTheDocument()
    expect(screen.getByText('Lycée des Tisserands · Dakar')).toBeInTheDocument()
    for (const link of screen.getAllByRole('link', { name: 'Nouvelle demande' })) {
      expect(link).toHaveAttribute('href', '/ecole/intervenants')
    }
  })

  it('annonce la prochaine rencontre confirmée et sélectionne son détail', async () => {
    setupMeetings()
    const { router, user } = renderApp('/ecole/rencontres', { token: true })

    const banner = await screen.findByRole('status', { name: 'Prochaine rencontre' })
    // Le métier vient de la fiche de l'intervenant, chargée ensuite.
    await waitFor(() =>
      expect(banner).toHaveTextContent(
        'Dans 4 jours · Awa Diallo, ingénieure réseaux, rencontre vos Terminale S2 samedi 28 novembre à 10h.',
      ),
    )
    await user.click(within(banner).getByRole('button', { name: 'Voir le détail' }))

    expect(detail().getByRole('heading', { name: 'Awa Diallo' })).toBeInTheDocument()
    expect(await detail().findByText('Ingénieure réseaux · Dakar')).toBeInTheDocument()
    expect(detail().getByText('Tout est prêt')).toBeInTheDocument()
    expect(detail().getByText('Pensez à prévenir vos élèves et à rassembler leurs questions pour Awa.')).toBeInTheDocument()
    expect(detail().getByText('Samedi 28 novembre · 10h00')).toBeInTheDocument()
    // Rencontre en ligne ancienne : affichée telle quelle, sans erreur (F6.1).
    expect(detail().getByText('En ligne · salle informatique')).toBeInTheDocument()
    expect(decision('Intervenant')).toBe('Validé')
    expect(decision('Fondation M')).toBe('Validé')
    expect(router.state.location.search).toBe(`?rencontre=${CONFIRMED.id}&mois=2026-11`)
  })

  it('affiche « En classe » et le lieu d’une rencontre en classe', async () => {
    setupMeetings()
    renderApp(`/ecole/rencontres?rencontre=${PENDING.id}&mois=2026-11`, { token: true })

    expect(await screen.findByRole('region', { name: 'Détail de la rencontre' })).toBeInTheDocument()
    expect(await detail().findByText('En classe · CDI, bâtiment B')).toBeInTheDocument()
  })

  it('invite à partager le retour d’une rencontre terminée (bientôt)', async () => {
    setupMeetings()
    renderApp('/ecole/rencontres', { token: true })

    const banner = await screen.findByRole('status', { name: 'Rencontre terminée' })
    expect(banner).toHaveTextContent('Votre rencontre avec Aminata Ba est terminée.')
    expect(banner).toHaveTextContent('Comment s\'est-elle passée pour vous et vos Terminale L2 ?')
    expect(within(banner).getByText('Partager mon retour')).toHaveTextContent('Bientôt')
    expect(within(banner).queryByRole('link')).not.toBeInTheDocument()
  })

  it('affiche le calendrier du mois, la légende et navigue entre les mois', async () => {
    setupMeetings()
    const { router, user } = renderApp('/ecole/rencontres', { token: true })

    const grid = await calendar()
    expect(grid.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim',
    ])
    expect(grid.getByRole('button', { name: 'Awa, 10h00, Confirmée' })).toHaveTextContent('10h00 · Awa')
    expect(grid.getByRole('button', { name: 'Moussa, 9h30, En attente' })).toBeInTheDocument()
    expect(grid.getByRole('button', { name: 'Fatou, 15h00, Refusée' })).toBeInTheDocument()
    expect(grid.getByRole('button', { name: 'Aminata, 14h00, Réalisée, passée' })).toBeInTheDocument()
    expect(grid.getByRole('button', { name: 'Moussa, 16h00, Annulée, passée' })).toBeInTheDocument()
    expect(grid.getByText('Partager mon retour · Bientôt')).toBeInTheDocument()
    expect(grid.getByText('24').closest('td')).toHaveAttribute('aria-current', 'date')

    const legend = within(screen.getByRole('list', { name: 'Légende' }))
    expect(legend.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'En attente', 'Confirmée', 'Réalisée', 'Refusée', 'Annulée', 'Jour passé',
    ])

    await user.click(screen.getAllByRole('button', { name: 'Mois suivant' })[0] ?? document.body)
    expect((await calendar('Décembre 2026')).getByRole('button', { name: /^Awa, 14h00, Refusée/ })).toBeInTheDocument()
    expect(router.state.location.search).toContain('mois=2026-12')
  })

  it('sélectionne par défaut la prochaine rencontre et détaille un refus de l’intervenant', async () => {
    setupMeetings()
    renderApp('/ecole/rencontres', { token: true })

    await calendar()
    expect(detail().getByText('Rencontre à venir')).toBeInTheDocument()
    expect(detail().getByRole('heading', { name: 'Fatou Sarr' })).toBeInTheDocument()
    expect(detail().getByText('Refusée par l’intervenant')).toBeInTheDocument()
    expect(detail().getByText('« Je suis de garde ce jeudi. »')).toBeInTheDocument()
    expect(decision('Intervenant')).toBe('Refusé')
    expect(decision('Fondation M')).toBe('—')
    expect(detail().getByRole('link', { name: 'Choisir un autre intervenant' })).toHaveAttribute('href', '/ecole/intervenants')
  })

  it('détaille une demande en attente, une annulation et un créneau pris', async () => {
    setupMeetings()
    const { user } = renderApp('/ecole/rencontres', { token: true })
    const grid = await calendar()

    await user.click(grid.getByRole('button', { name: 'Moussa, 9h30, En attente' }))
    expect(detail().getByText('Demande envoyée')).toBeInTheDocument()
    expect(detail().getByText('Moussa et la Fondation M vont vous répondre.')).toBeInTheDocument()
    expect(decision('Intervenant')).toBe('En attente')
    expect(decision('Fondation M')).toBe('En attente')

    await user.click(grid.getByRole('button', { name: 'Moussa, 16h00, Annulée, passée' }))
    expect(detail().getByText('Rencontre passée')).toBeInTheDocument()
    expect(detail().getByText('Annulée par la Fondation M')).toBeInTheDocument()
    expect(detail().getByText('Empêchement de dernière minute.')).toBeInTheDocument()
    expect(decision('Intervenant')).toBe('Validé')

    await user.click(list('À venir').getByRole('button', { name: /^Awa Diallo.*3 déc/ }))
    expect(detail().getByText('Créneau pris')).toBeInTheDocument()
    expect(detail().getByText('Ce créneau a été attribué à une autre classe.')).toBeInTheDocument()
  })

  it('affiche l’état du retour d’expérience des rencontres réalisées', async () => {
    setupMeetings()
    const { user } = renderApp(`/ecole/rencontres?rencontre=${COMPLETED_TO_WRITE.id}`, { token: true })

    await calendar()
    expect(detail().getByText('Comment cela s’est-il passé ?')).toBeInTheDocument()
    expect(detail().getByText("Retour d'expérience").nextElementSibling).toHaveTextContent('À rédiger')
    expect(detail().getByText('Partager votre retour d’expérience')).toHaveTextContent('Bientôt')

    // Rencontre d'octobre ouverte par l'URL : le calendrier s'ouvre sur son mois.
    await user.click(screen.getByRole('button', { name: 'Afficher les rencontres passées' }))
    await user.click(list('Passées').getByRole('button', { name: /^Awa Diallo.*22 oct/ }))
    expect(await calendar('Octobre 2026')).toBeTruthy()
    expect(detail().getByText('Une belle rencontre')).toBeInTheDocument()
    expect(detail().getByText("Retour d'expérience").nextElementSibling).toHaveTextContent('Validé')
  })

  it('ouvre le mois de la rencontre demandée dans l’URL', async () => {
    setupMeetings()
    renderApp(`/ecole/rencontres?rencontre=${COMPLETED_PUBLISHED.id}`, { token: true })

    expect(await calendar('Octobre 2026')).toBeTruthy()
    expect(detail().getByText('Une belle rencontre')).toBeInTheDocument()
  })

  it('liste les rencontres à venir et passées (repliable sur PC)', async () => {
    setupMeetings()
    const { user } = renderApp('/ecole/rencontres', { token: true })
    await calendar()

    const upcoming = list('À venir').getAllByRole('button')
    expect(upcoming.map((row) => row.textContent)).toEqual([
      'Fatou SarrJeu 26 nov. · 15h00 · Terminale S2Refusée',
      'Awa DialloSam 28 nov. · 10h00 · Terminale S2Confirmée',
      'Moussa NdiayeLun 30 nov. · 9h30 · Première LEn attente',
      'Awa DialloJeu 3 déc. · 14h00 · Terminale S2Refusée',
    ])
    const toggle = screen.getByRole('button', { name: 'Afficher les rencontres passées' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(list('Passées').getByRole('list')).getAllByRole('button').map((row) => row.textContent)).toEqual([
      'Moussa NdiayeJeu 12 nov. · 16h00 · Première S1Annulée',
      'Aminata BaMer 4 nov. · 14h00 · Terminale L2Retour à partager',
      'Awa DialloJeu 22 oct. · 11h00 · Terminale S2Réalisée',
    ])
  })

  it('propose un calendrier compact sur mobile', async () => {
    setupMeetings()
    const { user } = renderApp('/ecole/rencontres', { token: true })

    const compact = within(await screen.findByRole('table', { name: 'Calendrier compact de Novembre 2026' }))
    expect(compact.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D'])
    expect(compact.queryByRole('button', { name: /^25 :/ })).not.toBeInTheDocument()
    await user.click(compact.getByRole('button', { name: '30 : Moussa Ndiaye, En attente' }))
    expect(detail().getByRole('heading', { name: 'Moussa Ndiaye' })).toBeInTheDocument()
    expect(screen.getByText('Les jours passés sont grisés. La pastille indique le statut de la rencontre.')).toBeInTheDocument()
  })

  it('mène du bandeau de refus de l’annuaire à la rencontre concernée', async () => {
    setupMeetings()
    const { router, user } = renderApp('/ecole/intervenants', { token: true })

    await user.click(await screen.findByRole('link', { name: 'Voir la demande' }))

    expect(router.state.location.pathname).toBe('/ecole/rencontres')
    expect(router.state.location.search).toBe(`?rencontre=${REFUSED_BY_SPEAKER.id}&mois=2026-11`)
    expect((await screen.findByRole('region', { name: 'Détail de la rencontre' }))).toHaveTextContent('Fatou Sarr')
  })

  it('affiche un état vide sans rencontre', async () => {
    setupMeetings([])
    renderApp('/ecole/rencontres', { token: true })

    expect(await screen.findByRole('heading', { name: "Aucune rencontre pour l'instant." })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Prochaine rencontre' })).not.toBeInTheDocument()
  })
})
