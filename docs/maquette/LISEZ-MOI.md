# Maquette « Marché » — source de vérité du design

Ces fichiers `*.dc.html` sont la maquette exportée (HTML avec styles en ligne). Ils font foi pour les couleurs, tailles, rayons, espacements, textes et états. Pour chaque écran : `-pc` = PC, `-mobile` = téléphone.

Comment les lire : ouvre le fichier, repère les valeurs dans les attributs `style="…"` (couleur, font-size, padding, border-radius…), et les textes entre les balises. La logique de démonstration (balise `<script type="text/x-dc">`, état, jeux de données) montre les états et les couleurs de statut : ne la recopie pas, elle n'est pas du vrai code.

Rangement :
- W1 = École (W1-E1 connexion/attente, E3 intervenants, E4 demande, E5 rencontres, E6 retour d'expérience)
- W2 = Intervenant (E1 inscription, E7 attente, E8 agenda, E9 demandes, impact, E10 retour)
- W3 = Fondation (connexion, pilotage, comptes, demandes, rencontres, retours, requêtes)
- W4 = Donateur (connexion, impact, requêtes)
- W5 = Élève (E2 élèves gérés par l'école, E1 connexion, E19 espace ; E19 mobile est vide : dériver du PC)
- Main, Desktop, Intervenant, Jeune, Fondation, Donateur : explorations (accueils)

Règle : avant d'écrire une page, lis ses fichiers -pc et -mobile ; reproduis couleurs, tailles et textes à l'identique ; liste tout écart dans l'état. En cas de doute entre ces fichiers et une description de prompt, ces fichiers gagnent.
