import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Suite complète en parallèle sous jsdom : le premier rendu d'un fichier peut dépasser 1 s.
configure({ asyncUtilTimeout: 4_000 })

// jsdom n'implémente pas encore showModal() / close() de <dialog>.
function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '')
}

function closeDialog(this: HTMLDialogElement) {
  this.removeAttribute('open')
}

if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = showModal
  HTMLDialogElement.prototype.close = closeDialog
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})
