import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorResponse, jsonResponse, recordBodies, renderApp } from '../../test/helpers'
import { AWA, AWA_SLOTS, CLASSES, setupSchool } from '../../test/schoolFixtures'
import { freezeNow } from '../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

const PATH = `/ecole/intervenants/${AWA.id}/demande`
const [BOTH_SLOT, ONLINE_SLOT] = AWA_SLOTS

function form() {
  return within(screen.getByRole('form', { name: 'Demander une rencontre' }))
}

function summaryValue(label: string): string | null {
  const step = within(screen.getByRole('region', { name: /Vérifiez votre demande/ }))
  return step.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent ?? null
}

async function ready() {
  await screen.findByRole('radio', { name: /30 novembre/ })
  await screen.findByRole('radio', { name: /Terminale S2/ })
}

describe('Demander une rencontre', () => {
  it('présente l’intervenant invité', async () => {
    setupSchool()
    renderApp(PATH, { token: true })

    const invite = within(await screen.findByRole('region', { name: 'Vous invitez' }))
    expect(invite.getByText('Awa Diallo')).toBeInTheDocument()
    expect(invite.getByText('Ingénieure réseaux · Sonatel · Dakar')).toBeInTheDocument()
    expect(invite.getByText('Montrer aux élèves que les métiers du numérique leur sont ouverts.')).toBeInTheDocument()
    expect(invite.getByRole('link', { name: "Changer d'intervenant" })).toHaveAttribute('href', '/ecole/intervenants')
    const crumbs = within(screen.getByRole('navigation', { name: "Fil d'Ariane" }))
    expect(crumbs.getByRole('link', { name: 'Intervenants' })).toHaveAttribute('href', '/ecole/intervenants')
    expect(crumbs.getByText('Demande de rencontre')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { name: 'Demander une rencontre', level: 1 })).toBeInTheDocument()
  })

  it('envoie la demande puis affiche la confirmation', async () => {
    const bodies: unknown[] = []
    const { calls } = setupSchool({}, {
      'POST /api/school/meetings': recordBodies(bodies, () => jsonResponse(201, { id: 'b2000000-0000-4000-8000-000000000001', status: 'PENDING' })),
    })
    const { user } = renderApp(PATH, { token: true })
    await ready()

    await user.click(screen.getByRole('radio', { name: /30 novembre/ }))
    expect(screen.getByRole('radio', { name: /30 novembre/ })).toBeChecked()
    expect(summaryValue('Date')).toBe('Lundi 30 novembre, 9h30 – 11h00')
    await user.click(screen.getByRole('radio', { name: /Terminale S2/ }))
    await user.click(within(screen.getByRole('group', { name: 'Format de la rencontre' })).getByRole('button', { name: 'En classe' }))
    await user.type(form().getByLabelText(/^Où aura lieu la rencontre \?/), '  Salle 12  ')
    await user.type(form().getByLabelText('Un mot pour Awa (facultatif)'), 'Nos élèves ont hâte.')

    expect(summaryValue('Intervenant')).toBe('Awa Diallo')
    expect(summaryValue('Classe')).toBe('Terminale S2')
    expect(summaryValue('Format')).toBe('En classe')
    expect(summaryValue('Lieu')).toBe('Salle 12')
    expect(
      screen.getByText(/Awa et la Fondation M vont chacune répondre à votre demande\. Vous suivrez leurs réponses dans « Mes rencontres »\./),
    ).toBeInTheDocument()

    const before = calls('GET', '/api/school/speakers/' + AWA.id).length
    await user.click(screen.getByRole('button', { name: 'Envoyer la demande' }))

    const sent = within(await screen.findByRole('status', { name: 'Demande envoyée' }))
    expect(sent.getByText('Lundi 30 novembre, 9h30 – 11h00')).toBeInTheDocument()
    expect(sent.getByText('Terminale S2')).toBeInTheDocument()
    expect(sent.getByRole('link', { name: 'Retour aux intervenants' })).toHaveAttribute('href', '/ecole/intervenants')
    expect(bodies).toEqual([
      { classId: CLASSES[0]?.id, slotId: BOTH_SLOT?.id, format: 'IN_PERSON', place: 'Salle 12', message: 'Nos élèves ont hâte.' },
    ])
    await waitFor(() => expect(calls('GET', '/api/school/speakers/' + AWA.id).length).toBeGreaterThan(before))
  })

  it('valide le formulaire côté client', async () => {
    const { calls } = setupSchool()
    const { user } = renderApp(PATH, { token: true })
    await ready()
    const submit = screen.getByRole('button', { name: 'Envoyer la demande' })

    await user.click(submit)
    expect(await screen.findByText('Choisissez un créneau.')).toBeInTheDocument()
    expect(screen.getByText('Choisissez une classe.')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /30 novembre/ }))
    await user.click(screen.getByRole('radio', { name: /Première L/ }))
    await user.click(submit)
    expect(await screen.findByText('Choisissez le format de la rencontre.')).toBeInTheDocument()

    await user.click(within(screen.getByRole('group', { name: 'Format de la rencontre' })).getByRole('button', { name: 'En classe' }))
    await user.click(submit)
    expect(await screen.findByText('Indiquez où aura lieu la rencontre.')).toBeInTheDocument()
    expect(calls('POST', '/api/school/meetings')).toHaveLength(0)
  })

  it('impose le format d’un créneau en ligne et n’envoie ni lieu ni message vides', async () => {
    const bodies: unknown[] = []
    setupSchool({}, { 'POST /api/school/meetings': recordBodies(bodies, () => jsonResponse(201, {})) })
    const { user } = renderApp(PATH, { token: true })
    await ready()

    await user.click(screen.getByRole('radio', { name: /2 décembre/ }))
    expect(screen.getByText('En ligne (format du créneau)')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Format de la rencontre' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Première L/ }))
    await user.click(screen.getByRole('button', { name: 'Envoyer la demande' }))

    expect(await screen.findByRole('status', { name: 'Demande envoyée' })).toBeInTheDocument()
    expect(bodies).toEqual([{ classId: CLASSES[1]?.id, slotId: ONLINE_SLOT?.id, format: 'ONLINE' }])
  })

  it('crée une classe quand l’école n’en a pas, puis la sélectionne', async () => {
    const created: unknown[] = []
    const { store } = setupSchool({ classes: [] }, {
      'POST /api/school/classes': recordBodies(created, () => {
        const entry = { id: 'a1000000-0000-4000-8000-000000000009', title: 'Seconde A', fieldOfStudy: 'Générale', studentCount: 30 }
        store.classes = [entry]
        return jsonResponse(201, entry)
      }),
    })
    const { user } = renderApp(PATH, { token: true })

    expect(await screen.findByText("Vous n'avez pas encore de classe. Ajoutez-en une pour envoyer votre demande.")).toBeInTheDocument()
    const group = within(screen.getByRole('group', { name: 'Ajouter une classe' }))
    await user.click(group.getByRole('button', { name: 'Ajouter la classe' }))
    expect(await group.findByText("Indiquez l'intitulé de la classe.")).toBeInTheDocument()
    expect(group.getByText("Indiquez le nombre d'élèves.")).toBeInTheDocument()

    await user.type(group.getByLabelText(/^Intitulé/), 'Seconde A')
    await user.type(group.getByLabelText(/^Filière/), 'Générale')
    await user.type(group.getByLabelText(/^Effectif/), '30{Enter}')

    expect(await screen.findByRole('radio', { name: /Seconde A/ })).toBeChecked()
    expect(created).toEqual([{ title: 'Seconde A', fieldOfStudy: 'Générale', studentCount: 30 }])
    expect(screen.queryByRole('status', { name: 'Demande envoyée' })).not.toBeInTheDocument()
  })

  it.each([
    ['SLOT_NOT_AVAILABLE', 409, "Ce créneau n'est plus disponible. Choisissez-en un autre."],
    ['SLOT_PASSED', 409, 'Ce créneau est déjà passé. Choisissez-en un autre.'],
    ['CLASS_SLOT_OVERLAP', 400, 'Cette classe a déjà une rencontre à ce moment-là. Choisissez un autre créneau ou une autre classe.'],
    ['CLASS_FULL', 422, 'Cette classe ne peut plus recevoir de nouvelle demande pour le moment.'],
    ['STUDENT_COUNT_TOO_LOW', 400, 'Message serveur STUDENT_COUNT_TOO_LOW'],
  ])('affiche le message de %s (statut %i)', async (code, status, message) => {
    const { calls } = setupSchool({}, { 'POST /api/school/meetings': () => errorResponse(status, code) })
    const { user } = renderApp(PATH, { token: true })
    await ready()

    await user.click(screen.getByRole('radio', { name: /4 décembre/ }))
    await user.click(screen.getByRole('radio', { name: /Terminale S2/ }))
    await user.type(form().getByLabelText(/^Où aura lieu/), 'Salle 12')
    const before = calls('GET', '/api/school/speakers/' + AWA.id).length
    await user.click(screen.getByRole('button', { name: 'Envoyer la demande' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(calls('GET', '/api/school/speakers/' + AWA.id).length).toBeGreaterThanOrEqual(before)
  })

  it.each(['SLOT_NOT_AVAILABLE', 'SLOT_PASSED'])('recharge les créneaux et retire la sélection sur %s', async (code) => {
    const { calls } = setupSchool({}, { 'POST /api/school/meetings': () => errorResponse(409, code) })
    const { user } = renderApp(PATH, { token: true })
    await ready()

    await user.click(screen.getByRole('radio', { name: /4 décembre/ }))
    await user.click(screen.getByRole('radio', { name: /Terminale S2/ }))
    await user.type(form().getByLabelText(/^Où aura lieu/), 'Salle 12')
    const before = calls('GET', '/api/school/speakers/' + AWA.id).length
    await user.click(screen.getByRole('button', { name: 'Envoyer la demande' }))

    await screen.findByRole('alert')
    await waitFor(() => expect(calls('GET', '/api/school/speakers/' + AWA.id).length).toBeGreaterThan(before))
    expect(screen.getByRole('radio', { name: /4 décembre/ })).not.toBeChecked()
  })

  it('place les erreurs de validation du serveur sous les champs', async () => {
    setupSchool({}, {
      'POST /api/school/meetings': () =>
        jsonResponse(400, {
          code: 'VALIDATION_ERROR',
          message: 'Requête invalide',
          fieldErrors: [{ field: 'place', message: 'Le lieu est trop long.' }],
        }),
    })
    const { user } = renderApp(PATH, { token: true })
    await ready()

    await user.click(screen.getByRole('radio', { name: /4 décembre/ }))
    await user.click(screen.getByRole('radio', { name: /Terminale S2/ }))
    await user.type(form().getByLabelText(/^Où aura lieu/), 'Salle 12')
    await user.click(screen.getByRole('button', { name: 'Envoyer la demande' }))

    await waitFor(() => expect(form().getByLabelText(/^Où aura lieu/)).toHaveAccessibleDescription('Le lieu est trop long.'))
  })

  it('signale un intervenant introuvable', async () => {
    setupSchool({}, { [`GET /api/school/speakers/${AWA.id}`]: () => errorResponse(404, 'NOT_FOUND') })
    renderApp(PATH, { token: true })

    expect(await screen.findByRole('heading', { name: "Cet intervenant n'est plus disponible." })).toBeInTheDocument()
  })
})
