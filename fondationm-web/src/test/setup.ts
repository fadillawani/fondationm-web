import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Suite complète en parallèle sous jsdom : le premier rendu d'un fichier peut dépasser 1 s.
configure({ asyncUtilTimeout: 4_000 })

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})
