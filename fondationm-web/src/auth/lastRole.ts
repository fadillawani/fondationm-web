import type { Role } from './currentUser'

/**
 * Dernier rôle connecté, en mémoire vive seulement (aucun stockage) : après une déconnexion ou une
 * session expirée, l'utilisateur revient sur la page de connexion de sa persona. Un rechargement
 * complet l'oublie : la connexion de l'établissement sert alors de page par défaut.
 */
let current: Role | null = null

export const lastRole = {
  get: (): Role | null => current,
  set: (role: Role): void => {
    current = role
  },
  clear: (): void => {
    current = null
  },
}
