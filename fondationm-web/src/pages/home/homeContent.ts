import { PATHS } from '../../auth/roles'

/** Textes et liens de la vitrine (F14) ; « Le projet », l'accroche et le pied de page sont les textes validés. */
export const SITE_TITLE = 'Les Tisseurs de Destin — Fondation M'
export const HERO_TEXT = 'Les Tisseurs de Destin : des professionnels qui transmettent leur savoir et leurs conseils aux jeunes.'
export const PROJECT_TEXT =
  "Les Tisseurs de Destin est un projet de Monsieur Amadou Diaw, fondateur du groupe ISM. Depuis plus de trente ans, il accompagne des générations d'étudiants avec un regard de père : écouter, conseiller, croire en eux. Ce projet prolonge cet esprit : des professionnels bénévoles rencontrent des élèves et des étudiants pour leur ouvrir des portes et les aider à tisser leur propre destin."
export const FOOTER_TEXT = 'Un projet de Monsieur Amadou Diaw, fondateur du groupe ISM.'

/** Entrées du menu « Se connecter » (vocabulaire de la maquette : « Mécène »). */
export const LOGIN_ENTRIES = [
  { label: 'Établissement', to: PATHS.login },
  { label: 'Intervenant', to: PATHS.loginSpeaker },
  { label: 'Élève', to: PATHS.loginStudent },
  { label: 'Mécène', to: PATHS.loginDonor },
  { label: 'Équipe Fondation M', to: PATHS.loginFoundation },
] as const
