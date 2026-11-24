/**
 * Rencontres en ligne (lot F6.1) : les rencontres se font uniquement en classe pour le moment. Le frontend ne
 * propose ni n'envoie jamais ONLINE ; une donnée ONLINE déjà en base reste affichée honnêtement (« En ligne »).
 * Passer à `true` réactive le format dans : formulaire de créneau (agenda), « Format souhaité » des demandes reçues,
 * filtre « Format » et section « Autres zones · disponibles en ligne » de l'annuaire, choix du format et créneaux
 * ONLINE de « Demander une rencontre », libellés BOTH « En classe ou en ligne ».
 */
export const ONLINE_MEETINGS_ENABLED: boolean = false
