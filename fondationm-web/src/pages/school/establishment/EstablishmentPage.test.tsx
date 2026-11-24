import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, makeMe, mockApi, pagedHandler, renderApp } from '../../../test/helpers'
import { freezeNow } from '../../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const schoolMe = makeMe({
  profile: { type: 'SCHOOL', schoolName: 'Lycée de Sor', city: 'Saint-Louis', country: 'Sénégal', schoolType: 'HIGH_SCHOOL' },
})

const S2 = 'a1000000-0000-4000-8000-000000000001'
const L2 = 'a1000000-0000-4000-8000-000000000002'

interface ClassRow {
  id: string
  title: string
  fieldOfStudy: string
  studentCount: number
}
interface StudentRow {
  id: string
  email: string
  firstName: string
  lastName: string
  classId: string
  createdAt: string
}

type Reply = (request: Request, body: Record<string, unknown>) => Response | null

/** Backend simulé de « Mon établissement » : classes, élèves, et réponses forcées par test. */
function setup(initial: { classes?: ClassRow[]; students?: StudentRow[] } = {}, overrides: Record<string, Reply> = {}) {
  const store = {
    classes: initial.classes ?? [
      { id: S2, title: 'Terminale S2', fieldOfStudy: 'Scientifique', studentCount: 32 },
      { id: L2, title: 'Terminale L2', fieldOfStudy: 'Littéraire', studentCount: 3 },
    ],
    students: initial.students ?? [
      student('1', 'Khadija', 'Ba', S2),
      student('2', 'Mamadou', 'Diallo', S2),
    ],
  }
  const calls: { key: string; body: Record<string, unknown> }[] = []
  let next = 100

  function classJson(row: ClassRow) {
    return { ...row, accountsCount: store.students.filter((entry) => entry.classId === row.id).length }
  }

  async function route(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname
    const key = `${request.method} ${path}`
    const body = request.method === 'GET' || request.method === 'DELETE' ? {} : ((await request.json()) as Record<string, unknown>)
    calls.push({ key, body })
    const forced = overrides[key]?.(request, body)
    if (forced) return forced
    if (key === 'GET /api/me') return jsonResponse(200, schoolMe)
    if (key === 'GET /api/school/classes') return pagedHandler(() => store.classes.map(classJson))(request)
    if (key === 'POST /api/school/classes') {
      const row = { id: `a1000000-0000-4000-8000-000000000${next++}`, title: String(body.title), fieldOfStudy: String(body.fieldOfStudy), studentCount: Number(body.studentCount) }
      store.classes.push(row)
      return jsonResponse(201, classJson(row))
    }
    const classStudents = /^GET \/api\/school\/classes\/([^/]+)\/students$/.exec(key)
    if (classStudents) return pagedHandler(() => store.students.filter((entry) => entry.classId === classStudents[1]))(request)
    const addStudentPath = /^POST \/api\/school\/classes\/([^/]+)\/students$/.exec(key)
    if (addStudentPath) {
      if (store.students.some((entry) => entry.email === body.email)) {
        return jsonResponse(409, { code: 'EMAIL_ALREADY_USED', message: 'Cette adresse e-mail est déjà utilisée.', fieldErrors: [] })
      }
      const row = student(String(next++), String(body.firstName), String(body.lastName), addStudentPath[1] ?? '', String(body.email))
      store.students.push(row)
      return jsonResponse(201, row)
    }
    const classId = /^(PATCH|DELETE) \/api\/school\/classes\/([^/]+)$/.exec(key)
    if (classId) {
      const row = store.classes.find((entry) => entry.id === classId[2])
      if (!row) return jsonResponse(404, { code: 'NOT_FOUND', message: 'Introuvable' })
      if (classId[1] === 'DELETE') {
        store.classes = store.classes.filter((entry) => entry !== row)
        return new Response(null, { status: 204 })
      }
      Object.assign(row, body)
      return jsonResponse(200, classJson(row))
    }
    const studentId = /^(PATCH|DELETE) \/api\/school\/students\/([^/]+)$/.exec(key)
    if (studentId) {
      const row = store.students.find((entry) => entry.id === studentId[2])
      if (!row) return jsonResponse(404, { code: 'NOT_FOUND', message: 'Introuvable' })
      if (studentId[1] === 'DELETE') {
        store.students = store.students.filter((entry) => entry !== row)
        return new Response(null, { status: 204 })
      }
      Object.assign(row, body)
      return jsonResponse(200, row)
    }
    if (/^POST \/api\/school\/students\/[^/]+\/password$/.test(key)) return new Response(null, { status: 204 })
    if (key === 'GET /api/school/meetings') return pagedHandler(() => [])(request)
    throw new Error(`Appel non simulé : ${key}`)
  }

  const fetchMock = mockApi(new Proxy({}, { get: () => route }))
  return { store, calls, fetchMock }
}

function student(id: string, firstName: string, lastName: string, classId: string, email?: string): StudentRow {
  return {
    id: `c1000000-0000-4000-8000-${id.padStart(12, '0')}`,
    email: email ?? `${firstName.toLowerCase()}.${lastName.toLowerCase()}.sor@eleve.fondationm.sn`,
    firstName,
    lastName,
    classId,
    createdAt: '2026-11-02T09:00:00+01:00',
  }
}

const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/

async function addStudent(user: ReturnType<typeof renderApp>['user'], first: string, last: string) {
  await user.type(screen.getByLabelText('Prénom'), first)
  await user.type(screen.getByLabelText('Nom'), last)
  await user.click(screen.getByRole('button', { name: '+ Ajouter à la classe' }))
}

function sheetCard() {
  return within(screen.getByRole('region', { name: "Fiche d'accès" }))
}

describe('Mon établissement', () => {
  it('est une entrée active de la navigation et reprend la maquette W5-E2', async () => {
    setup()
    renderApp('/ecole/etablissement', { token: true })

    expect(await screen.findByRole('heading', { level: 1, name: 'Les élèves de vos classes' })).toBeInTheDocument()
    expect(screen.getAllByText('Mon établissement · Élèves').length).toBeGreaterThan(0)
    const tabs = within(await screen.findByRole('tablist', { name: 'Classe' }))
    expect(tabs.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Terminale S2 · 2', 'Terminale L2 · 0'])
    expect(tabs.getByRole('tab', { name: /Terminale S2/ })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('2 élèves rattachés · effectif déclaré 32')).toBeInTheDocument()
    const table = within(screen.getByRole('table', { name: 'Liste des élèves' }))
    expect(table.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Élève', 'Accès', 'Action'])
    expect(table.getAllByText('Accès créé')).toHaveLength(2)
    expect(table.getByRole('button', { name: 'Nouvelle fiche pour Khadija Ba' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ce que vos élèves verront' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Voir ce que l'élève verra|Vue élève/ })).not.toBeInTheDocument()

    await tabs.findByRole('tab', { name: /Terminale L2/ })
    await screen.findByText('2 élèves rattachés · effectif déclaré 32')
  })

  it('change de classe avec les onglets (clic, flèches)', async () => {
    setup()
    const { router, user } = renderApp('/ecole/etablissement', { token: true })
    const tabs = within(await screen.findByRole('tablist', { name: 'Classe' }))

    tabs.getByRole('tab', { name: /Terminale S2/ }).focus()
    await user.keyboard('{ArrowRight}')
    expect(tabs.getByRole('tab', { name: /Terminale L2/ })).toHaveFocus()
    expect(router.state.location.search).toBe(`?classe=${L2}`)
    expect(await screen.findByText("Aucun élève rattaché pour l'instant. Ajoutez le premier ci-dessous.")).toBeInTheDocument()
  })

  it('propose de créer la première classe quand il n’y en a aucune', async () => {
    setup({ classes: [], students: [] })
    const { user } = renderApp('/ecole/etablissement', { token: true })

    expect(await screen.findByText("Vous n'avez pas encore de classe. Créez la première.")).toBeInTheDocument()
    const form = within(screen.getByRole('group', { name: 'Ajouter une classe' }))
    await user.type(form.getByLabelText(/^Intitulé/), 'Seconde A')
    await user.type(form.getByLabelText(/^Filière/), 'Générale')
    await user.type(form.getByLabelText(/^Effectif/), '30{Enter}')

    expect(await screen.findByRole('tab', { name: 'Seconde A · 0' })).toHaveAttribute('aria-selected', 'true')
  })

  it('ajoute un élève avec son accès et n’affiche le code que sur la fiche', async () => {
    const { calls } = setup()
    const { user } = renderApp('/ecole/etablissement', { token: true })
    await screen.findByText('2 élèves rattachés · effectif déclaré 32')

    await user.click(screen.getByRole('button', { name: '+ Ajouter à la classe' }))
    expect(screen.getByRole('alert')).toHaveTextContent("Indiquez le prénom et le nom de l'élève.")

    await addStudent(user, 'Rokhaya', 'Fayé')
    const card = await waitFor(sheetCard)
    const sent = calls.find((call) => call.key.startsWith('POST /api/school/classes/'))
    expect(sent?.body).toMatchObject({ firstName: 'Rokhaya', lastName: 'Fayé', email: 'rokhaya.faye.sor@eleve.fondationm.sn' })
    const code = String(sent?.body.password)
    expect(code).toMatch(CODE)
    expect(card.getByText('Rokhaya Fayé')).toBeInTheDocument()
    expect(card.getByText('rokhaya.faye.sor')).toBeInTheDocument()
    expect(card.getByText(code)).toBeInTheDocument()
    expect(card.getByText('Remettez cette fiche en main propre. Ce code ne sera plus affiché après votre départ de cette page.')).toBeInTheDocument()
    expect(await screen.findByText('3 élèves rattachés · effectif déclaré 32')).toBeInTheDocument()
    expect(within(screen.getByRole('table', { name: 'Liste des élèves' })).getByText('Fiche à remettre')).toBeInTheDocument()
    expect(screen.getByText('Imprimez les fiches avant de quitter cette page : les codes ne seront plus affichés.')).toBeInTheDocument()

    // Le code n'est nulle part ailleurs : ni stockage, ni URL.
    const stored = [localStorage, sessionStorage].flatMap((storage) =>
      Array.from({ length: storage.length }, (_, index) => storage.getItem(storage.key(index) ?? '') ?? ''),
    )
    expect(stored.some((value) => value.includes(code))).toBe(false)
    expect(window.location.href).not.toContain(code)
  })

  it('imprime la fiche seule, puis retire l’avertissement', async () => {
    setup()
    const printed: string[] = []
    vi.spyOn(window, 'print').mockImplementation(() => {
      printed.push(document.body.className, document.querySelector('.fiches-impression')?.textContent ?? '')
    })
    const { user } = renderApp('/ecole/etablissement', { token: true })
    await screen.findByText('2 élèves rattachés · effectif déclaré 32')
    await addStudent(user, 'Rokhaya', 'Faye')
    await waitFor(sheetCard)

    const beforeUnload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(beforeUnload)
    expect(beforeUnload.defaultPrevented).toBe(true)

    await user.click(sheetCard().getByRole('button', { name: 'Imprimer la fiche' }))
    expect(window.print).toHaveBeenCalledTimes(1)
    expect(printed[0]).toContain('impression-fiches')
    expect(printed[1]).toContain('rokhaya.faye.sor')
    expect(document.body.className).not.toContain('impression-fiches')
    expect(document.querySelector('.fiches-impression')).toBeNull()
    expect(screen.queryByText(/Imprimez les fiches avant de quitter/)).not.toBeInTheDocument()

    const after = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
  })

  it('demande confirmation avant de quitter la page avec des fiches non imprimées', async () => {
    setup()
    const { router, user } = renderApp('/ecole/etablissement', { token: true })
    await screen.findByText('2 élèves rattachés · effectif déclaré 32')
    await addStudent(user, 'Rokhaya', 'Faye')
    await waitFor(sheetCard)

    const [sidebarNav] = screen.getAllByRole('navigation', { name: 'Navigation principale' })
    if (sidebarNav === undefined) throw new Error('Navigation absente')
    await user.click(within(sidebarNav).getByRole('link', { name: 'Intervenants' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Quitter sans imprimer ?' }))
    expect(router.state.location.pathname).toBe('/ecole/etablissement')
    await user.click(dialog.getByRole('button', { name: 'Rester et imprimer' }))
    expect(router.state.location.pathname).toBe('/ecole/etablissement')
    expect(sheetCard().getByText('rokhaya.faye.sor')).toBeInTheDocument()

    await user.click(within(sidebarNav).getByRole('link', { name: 'Intervenants' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Quitter sans imprimer ?' })).getByRole('button', { name: 'Quitter la page' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/ecole/intervenants'))
  })

  it('garde les fiches en changeant d’onglet et les imprime toutes ensemble', async () => {
    setup()
    vi.spyOn(window, 'print').mockImplementation(() => undefined)
    const { user } = renderApp('/ecole/etablissement', { token: true })
    await screen.findByText('2 élèves rattachés · effectif déclaré 32')
    await addStudent(user, 'Rokhaya', 'Faye')
    await waitFor(sheetCard)
    await addStudent(user, 'Cheikh', 'Fall')
    expect(await screen.findByRole('button', { name: 'Imprimer les fiches (2)' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Terminale L2/ }))
    expect(await screen.findByText("Aucun élève rattaché pour l'instant. Ajoutez le premier ci-dessous.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Imprimer les fiches/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Terminale S2/ }))
    await user.click(await screen.findByRole('button', { name: 'Imprimer les fiches (2)' }))
    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it('numérote l’adresse si elle est prise, seulement sur le code EMAIL_ALREADY_USED', async () => {
    const { calls } = setup({ students: [student('1', 'Khadija', 'Ba', S2)] })
    const { user } = renderApp('/ecole/etablissement', { token: true })
    await screen.findByText('1 élève rattaché · effectif déclaré 32')

    await addStudent(user, 'Khadija', 'Ba')
    expect(await waitFor(sheetCard).then((card) => card.getByText('khadija.ba.sor2'))).toBeInTheDocument()
    expect(calls.filter((call) => call.key.startsWith('POST /api/school/classes/')).map((call) => call.body.email)).toEqual([
      'khadija.ba.sor@eleve.fondationm.sn',
      'khadija.ba.sor2@eleve.fondationm.sn',
    ])
  })

  it('ne réessaie pas un 409 sans code', async () => {
    const { calls } = setup({}, {
      [`POST /api/school/classes/${S2}/students`]: () => jsonResponse(409, { message: 'Conflit.' }),
    })
    const { user } = renderApp('/ecole/etablissement', { token: true })
    await screen.findByText('2 élèves rattachés · effectif déclaré 32')

    await addStudent(user, 'Rokhaya', 'Faye')
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflit.')
    expect(calls.filter((call) => call.key.startsWith('POST /api/school/classes/'))).toHaveLength(1)
  })

  it('signale une classe complète et propose de la modifier', async () => {
    setup({}, {
      [`POST /api/school/classes/${S2}/students`]: () => jsonResponse(409, { code: 'CLASS_FULL', message: 'Classe pleine' }),
    })
    const { user } = renderApp('/ecole/etablissement', { token: true })
    await screen.findByText('2 élèves rattachés · effectif déclaré 32')

    await addStudent(user, 'Rokhaya', 'Faye')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Cette classe est complète (effectif déclaré 32). Augmentez l'effectif pour ajouter un élève.",
    )
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Modifier la classe' }))
    expect(screen.getByRole('group', { name: 'Modifier la classe Terminale S2' })).toBeInTheDocument()
  })

  it('crée une nouvelle fiche après confirmation', async () => {
    const { calls } = setup()
    const { user } = renderApp('/ecole/etablissement', { token: true })

    await user.click(await screen.findByRole('button', { name: 'Nouvelle fiche pour Khadija Ba' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Nouvelle fiche pour Khadija Ba ?' }))
    expect(dialog.getByText("L'ancien code ne fonctionnera plus et l'élève sera déconnecté.")).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Créer une nouvelle fiche' }))

    const card = await waitFor(sheetCard)
    const sent = calls.find((call) => call.key.endsWith('/password'))
    expect(sent?.key).toBe('POST /api/school/students/c1000000-0000-4000-8000-000000000001/password')
    expect(String(sent?.body.newPassword)).toMatch(CODE)
    expect(card.getByText(String(sent?.body.newPassword))).toBeInTheDocument()
    expect(card.getByText('khadija.ba.sor')).toBeInTheDocument()
  })

  it('déplace et retire un élève', async () => {
    const { calls } = setup()
    const { user } = renderApp('/ecole/etablissement', { token: true })

    await user.click(await screen.findByRole('button', { name: 'Mamadou Diallo : gérer l’accès' }))
    const manage = within(screen.getByRole('region', { name: 'Gérer Mamadou Diallo' }))
    expect(manage.getByLabelText('Changer de classe')).toHaveValue(L2)
    await user.click(manage.getByRole('button', { name: 'Déplacer' }))
    expect(await screen.findByRole('tab', { name: 'Terminale L2 · 1' })).toBeInTheDocument()
    expect(calls).toContainEqual({ key: 'PATCH /api/school/students/c1000000-0000-4000-8000-000000000002', body: { classId: L2 } })

    await user.click(await screen.findByRole('button', { name: 'Khadija Ba : gérer l’accès' }))
    await user.click(within(screen.getByRole('region', { name: 'Gérer Khadija Ba' })).getByRole('button', { name: 'Retirer l’élève' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Retirer Khadija Ba ?' }))
    expect(dialog.getByText('Son accès sera supprimé.')).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Retirer l’élève' }))
    expect(await screen.findByText("Aucun élève rattaché pour l'instant. Ajoutez le premier ci-dessous.")).toBeInTheDocument()
  })

  it.each([
    ['CLASS_NOT_EMPTY', 'Cette classe a encore des élèves. Déplacez-les ou retirez-les avant de la supprimer.'],
    ['CLASS_HAS_MEETINGS', 'Cette classe a des rencontres. Elle ne peut pas être supprimée.'],
  ])('affiche un message dédié pour %s à la suppression', async (code, message) => {
    setup({}, { [`DELETE /api/school/classes/${S2}`]: () => jsonResponse(409, { code, message: 'x' }) })
    const { user } = renderApp('/ecole/etablissement', { token: true })

    await user.click(await screen.findByRole('button', { name: 'Supprimer la classe' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Supprimer la classe Terminale S2 ?' })).getByRole('button', { name: 'Supprimer la classe' }))
    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('modifie la classe et explique STUDENT_COUNT_TOO_LOW', async () => {
    const { calls } = setup({}, {
      [`PATCH /api/school/classes/${S2}`]: (_request, body) =>
        body.studentCount === 1 ? jsonResponse(400, { code: 'STUDENT_COUNT_TOO_LOW', message: 'x' }) : null,
    })
    const { user } = renderApp('/ecole/etablissement', { token: true })

    await user.click(await screen.findByRole('button', { name: 'Modifier la classe' }))
    const form = within(screen.getByRole('group', { name: 'Modifier la classe Terminale S2' }))
    await user.clear(form.getByLabelText(/^Effectif/))
    await user.type(form.getByLabelText(/^Effectif/), '1')
    await user.click(form.getByRole('button', { name: 'Enregistrer' }))
    expect(await form.findByText("L'effectif déclaré ne peut pas être inférieur au nombre d'élèves déjà rattachés (2).")).toBeInTheDocument()

    await user.clear(form.getByLabelText(/^Effectif/))
    await user.type(form.getByLabelText(/^Effectif/), '35')
    await user.click(form.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('2 élèves rattachés · effectif déclaré 35')).toBeInTheDocument()
    expect(calls).toContainEqual({ key: `PATCH /api/school/classes/${S2}`, body: { studentCount: 35 } })
  })

  it('ajoute plusieurs élèves : aperçu, places restantes, arrêt à la première erreur et reprise', async () => {
    let failOnce = true
    setup({}, {
      [`POST /api/school/classes/${L2}/students`]: (_request, body) => {
        if (body.firstName === 'Modou' && failOnce) {
          failOnce = false
          return jsonResponse(429, { code: 'RATE_LIMITED', message: 'x' })
        }
        return null
      },
    })
    const { user } = renderApp(`/ecole/etablissement?classe=${L2}`, { token: true })
    await screen.findByText("Aucun élève rattaché pour l'instant. Ajoutez le premier ci-dessous.")

    await user.click(screen.getByRole('button', { name: 'Ajouter plusieurs élèves' }))
    const bulk = within(screen.getByRole('region', { name: 'Ajouter plusieurs élèves' }))
    expect(bulk.getByText('3 places restantes')).toBeInTheDocument()
    fireEvent.change(bulk.getByLabelText(/Une personne par ligne/), {
      target: { value: 'Mame Diarra Bousso\nModou\tFaye\nAstou Ndour\nBineta Diouf' },
    })
    await user.click(bulk.getByRole('button', { name: 'Voir l’aperçu' }))
    expect(bulk.getByLabelText('Prénom, ligne 1')).toHaveValue('Mame')
    expect(bulk.getByLabelText('Nom, ligne 1')).toHaveValue('Diarra Bousso')
    expect(bulk.getByText(/4 lignes pour 3 places restantes/)).toBeInTheDocument()
    expect(bulk.getByRole('button', { name: 'Créer 4 élèves' })).toBeDisabled()
    expect(bulk.getByRole('button', { name: 'Modifier la classe' })).toBeInTheDocument()

    // Correction du prénom composé, une ligne retirée.
    await user.click(bulk.getByRole('button', { name: 'Modifier la liste' }))
    fireEvent.change(bulk.getByLabelText(/Une personne par ligne/), {
      target: { value: 'Mame Diarra ; Bousso\nModou\tFaye\nAstou Ndour' },
    })
    await user.click(bulk.getByRole('button', { name: 'Voir l’aperçu' }))
    await user.click(bulk.getByRole('button', { name: 'Créer 3 élèves' }))

    expect(await bulk.findByRole('alert')).toHaveTextContent(
      '1 élève créé. Échec à la ligne 2 (Modou Faye) : Trop de demandes, réessayez dans un instant. 2 lignes restantes.',
    )
    expect(bulk.getByLabelText('Prénom, ligne 2')).toHaveValue('Modou')
    await user.click(bulk.getByRole('button', { name: 'Reprendre' }))
    expect(await bulk.findByText('2 élèves ajoutés. Leurs fiches sont prêtes à imprimer.')).toBeInTheDocument()
    expect(await screen.findByRole('tab', { name: 'Terminale L2 · 3' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Imprimer les fiches (3)' })).toBeInTheDocument()
  })
})
