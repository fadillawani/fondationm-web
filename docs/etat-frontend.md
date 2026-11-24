# État du frontend — Fondation M

Dernière mise à jour : 24 novembre 2026 — lot F5.2 (connexions par persona, Pays et Zone en listes fermées).

**Source de vérité du design : `docs/maquette/` (fichiers `.dc.html`, voir `docs/maquette/LISEZ-MOI.md`).** Elle prime sur toute consigne écrite, sauf contrainte du backend ou règle d'accessibilité (contraste ≥ 4,5:1), signalées dans ce document.

## Avancement

| Lot | Contenu                                                                     | État     |
| --- | --------------------------------------------------------------------------- | -------- |
| F0  | Configuration, jetons de design, composants de base, client d'API, session, gardes, erreurs, connexion, accueils provisoires | Terminé |
| F0.1 | Design de la maquette « Marché » appliqué (thème, composants, connexion, mise en page) | Terminé |
| F1  | Inscription établissement et intervenant, pages « en attente » et « refusé », changement de mot de passe obligatoire | Terminé |
| F2  | Espace Fondation : navigation, « Comptes à valider » (liste, détail, validation, refus motivé) | Terminé |
| F3  | Espace intervenant : navigation, « Mon agenda » (calendrier, créneaux), « Demandes reçues » (accepter, refuser) | Terminé |
| F4  | Espace établissement : « Intervenants disponibles » (annuaire, carte du réseau), « Demander une rencontre » ; thèmes de barre latérale par persona | Terminé |
| F5  | « Mes rencontres » de l'école (calendrier, détail, listes) ; socle commun aligné sur la maquette (barres latérales, navigation basse blanche, en-têtes de page, carte utilisateur) ; corrections D1, E2, E5, B2, C2, F2 | Terminé |
| F5.1 | Conformité à la maquette de F1 à F5 (valeur par valeur), agenda mobile en calendrier compact | Terminé |
| F5.2 | Une page de connexion par persona (W3, W4, W5 ; école et intervenant), Pays et Zone (ville) en listes fermées | Terminé |
| F6+ | Autres écrans métier (mon établissement, retours d'expérience, tableau de bord Fondation, donateurs…) | À faire  |

Vérifications au moment de la livraison de F5.2 : `npm run build`, `npm run lint` et `npm test`
(172 tests) passent sans erreur ni avertissement.

## Corrections

- **24/11/2026 — connexion bloquée sur `/connexion` avec « Impossible de joindre le serveur ».**
  `GET /api/me` renvoie des `null` explicites (`profile: null` pour FOUNDATION, `rejectionReason: null`
  hors refus) alors que le contrat les déclare seulement facultatifs. La lecture du profil testait
  `profile !== undefined`, puis `'schoolName' in null` levait une `TypeError`, convertie à tort en
  `NETWORK_ERROR`.
  - `auth/currentUser.ts` lit la réponse de `/api/me` comme une donnée non fiable : tout champ `null`,
    absent ou d'un type inattendu est traité comme absent (profil et ses champs compris) ; `role`,
    `status`, `schoolType` et `sector` sont vérifiés contre les valeurs connues. Seuls `id`, `role` et
    `status` restent indispensables (`INVALID_RESPONSE` sinon).
  - `api/errors.ts` : `NETWORK_ERROR` uniquement pour un vrai échec de `fetch` (aucune réponse), signalé par
    `NetworkFailureError` dans `api/transport.ts`. Toute autre exception inattendue devient
    `UNEXPECTED_ERROR` : « Une erreur inattendue s'est produite. Réessayez. » (bouton « Réessayer » proposé).
  - Tests ajoutés : `/api/me` avec `profile: null` (FOUNDATION → `/fondation`), avec
    `rejectionReason: null` (SCHOOL PENDING → `/compte-en-attente`), réponse illisible affichée comme
    `UNEXPECTED_ERROR` et non comme panne réseau ; tests unitaires de `errors.ts` mis à jour. 74 tests.

- **24/11/2026 — déconnexion : requêtes relancées sans jeton.** `endSession` vidait le cache TanStack
  Query avant que les pages connectées soient démontées : leurs requêtes se reconstruisaient et partaient
  sans jeton (avec le vrai serveur : 401, puis « Session expirée » au lieu d'une déconnexion simple).
  Décelé par le test « efface le jeton et le cache à la déconnexion » une fois `/ecole` devenue une vraie
  page. Correctif : `endSession` efface le jeton et annule les requêtes ; `RequireAuth` vide le cache
  quand l'espace connecté se démonte (décision 46). Test ajouté : aucune requête sans jeton après la
  déconnexion depuis l'annuaire.

## Ce que F5.2 livre

**Une page de connexion par persona.** Toutes envoient le même `POST /api/auth/login`, puis lisent `/api/me`.
La redirection suit le rôle réel du compte : un compte qui se connecte sur la page d'une autre persona
arrive quand même dans son espace. Les messages d'erreur ne changent pas. Toutes ces pages sont publiques ;
un utilisateur connecté est renvoyé vers son accueil.

| Route | Maquette | Colonne | Formulaire |
| --- | --- | --- | --- |
| `/connexion` (établissement) | Colonne W1-E1 ; formulaire aux valeurs de W3 | terracotta, « Espace établissement », étapes 1 à 3, contact | onglets « Se connecter » (actif indigo / crème) / « Créer un compte » → `/inscription/ecole` |
| `/connexion/intervenant` | Colonne W2-E1 | orange, « Espace intervenant » | onglets « Se connecter » (actif encre / crème) / « Devenir intervenant » → `/inscription/intervenant` |
| `/connexion/fondation` | W3-connexion | terracotta | « Bon retour parmi nous », « Connectez-vous avec votre adresse de la Fondation. », bouton terracotta |
| `/connexion/donateur` | W4-connexion | vert `#4E6A2C` | « Utilisez l'accès reçu par e-mail de la Fondation M. », bouton vert, « Accès perdu ? Écrivez à donateurs@fondationm.sn. » |
| `/connexion/eleve` | W5-E1-connexion | jaune `#E5A60A`, pastilles des secteurs | « Content de te voir ! », « Identifiant », « Code d'accès ou mot de passe », bouton « Entrer » encre / crème |

- **Fichiers** : `pages/login/LoginForm.tsx` (formulaire commun, mode e-mail ou élève), une page par persona
  (`SchoolLoginPage`, `SpeakerLoginPage`, `FoundationLoginPage`, `DonorLoginPage`, `StudentLoginPage`),
  `PersonaLinks.tsx` ; `components/layout/LoginSplitLayout.tsx` (colonnes W3, W4, W5 ; en-tête mobile à
  bas arrondi 32) ; `pages/register/authColumns.ts` (colonne commune à l'inscription et à la connexion
  école / intervenant). `pages/LoginPage.tsx` est remplacé par `pages/login/SchoolLoginPage.tsx`.
- **Identifiant élève** (`lib/studentLogin.ts`) : sans « @ », le client envoie `{identifiant}@eleve.fondationm.sn` ;
  avec « @ », la saisie part telle quelle. Aucun contrôle de format ; champ vide : « Indique ton identifiant. »
  (tutoiement, comme toute la page).
- **Liens entre les pages** : au bas de `/connexion`, « Vous êtes : Intervenant · Équipe Fondation M · Mécène · Élève » ;
  au bas de `/connexion/intervenant`, même ligne avec « Établissement » au lieu d'« Intervenant » ; sur les pages
  Fondation, donateur et élève, « Vous êtes une école ou un intervenant ? Se connecter ».
- **Retour vers la bonne page** (`auth/lastRole.ts`) : le dernier rôle lu dans `/api/me` est gardé en mémoire vive
  (aucun stockage). Déconnexion, session expirée et accès protégé sans jeton mènent à la connexion de cette
  persona ; sans rôle connu (rechargement complet), à `/connexion`. Après une inscription dont la connexion
  automatique échoue : `/connexion` (école) ou `/connexion/intervenant`.
- **Pays et Zone (ville) en listes fermées** dans les deux inscriptions (`pages/register/PlaceFields.tsx`,
  `lib/places.ts`) : les 9 pays de W1-E1 PC, Sénégal choisi par défaut ; pour le Sénégal, « Zone (ville) » est
  une liste de 16 villes (Dakar, Saint-Louis, Thiès, Kaolack, Ziguinchor, Touba, Louga, Tambacounda, Mbour,
  Diourbel, Fatick, Kaffrine, Kédougou, Kolda, Matam, Sédhiou) ; pour un autre pays, un champ libre. Changer de
  pays vide la ville. Pas d'option « Autre ». Le backend ne change pas ; un ancien compte avec une ville hors liste
  s'affiche tel quel. La carte du réseau garde ses 8 villes positionnées (test : leurs noms sont ceux de
  `SENEGAL_CITIES`) ; les autres villes n'apparaissent que dans les pastilles « Choisir une ville ».
- **Contrastes** : crème sur terracotta en `#FFF0C4` (4,60:1, décision 10) ; « Artisanat » de W5 en encre sur
  orange (5,71:1 ; blanc : 2,82:1). Vert : crème 5,01:1, blanc 6,14:1 ; jaune : encre 7,50:1 ; bouton encre /
  crème 13,14:1. Aucun échec.

## Ce que F5.1 livre

Passe de conformité valeur par valeur (couleurs, tailles, poids, rayons, paddings, hauteurs, textes, ordre,
états) entre `docs/maquette/` et le code, écran par écran.

- **F1 — inscription, attente, connexion** (W1-E1, W2-E1, W2-E7 ; valeurs communes de W3/W4/W5-connexion) :
  1. accroche mobile de l'école « Des professionnels bénévoles rencontrent vos classes. La Fondation M accompagne chaque rencontre. » ;
  2. onglets d'accès en contrôle segmenté (`#F7F3EA`, rayon 16, padding 6 ; onglets rayon 12, 15 px) ;
  3. onglet actif école `#2B337A`/`#FDE7A6` (au lieu de terracotta) ;
  4. onglet intervenant « Devenir intervenant » ;
  5. titre du formulaire Lilita 30 (26 sur mobile) ;
  6. libellé « Type » (au lieu de « Type d'établissement ») ;
  7. libellé « Fonction » (au lieu de « Votre fonction »), placeholder retiré ;
  8. « Zone (ville) » bordure 2 px `#B8492A`, poids 700 ;
  9. case à cocher 20 px, libellé 14 px / 600 `#4A4A57` ;
  10. lien « Lire la charte » retiré des formulaires (absent de la maquette) ;
  11. phrases de bas de formulaire en 13 px / 700 ;
  12. étapes de la colonne en poids 800 ;
  13. ligne « Une question ? contact@fondationm.sn · +221 33 800 00 00 » (13 px / 700, téléphone de la maquette) ;
  14. carte du formulaire rayon 24 sur mobile ;
  15. « Votre métier », « Votre secteur » + aide « Le secteur principal de votre métier. Il aide les écoles à vous trouver. » (12 px / 700 gris) ;
  16. « Structure » et « Pourquoi voulez-vous transmettre ? » avec mention « (facultatif…) » en poids 600 gris ;
  17. aide du mot de passe intervenant en `#3B5221` ;
  18. légendes de groupe interlettrage 0,1em ;
  19. attente : en-tête blanc (logo Lilita 28 terracotta, « {établissement} » / « {nom} · intervenant » 14 px / 700, « Se déconnecter ») ;
  20. pastille « Compte en attente » (intervenant « Compte en attente de validation »), 13 px / 900 ;
  21. titre intervenant « Merci {Prénom}, les jeunes vont avoir de la chance » ;
  22. textes d'introduction PC et mobile de la maquette (sans promesse d'e-mail) ;
  23. frise : ronds 32 px (28 mobile), terminé vert coché, en cours crème bordure 4 px jaune point terracotta, à venir bordure 3 px `#C9BFA8`, traits 4 px ; horizontale PC, verticale mobile ; `aria-current="step"` ;
  24. détails « Terminé · 12 nov, 16h42 » (`#3B5221`), « En cours par la Fondation M » (`#8A5F00`), « À venir · choisissez un intervenant » / « À venir · publiez vos disponibilités » ;
  25. étape 4 intervenant « Vos créneaux » ;
  26. bloc « Votre demande » / « Votre profil » (rayon 24, padding 28, titre Lilita 22 majuscules ; « Établissement (lycée) », « Pays · zone », « Référent », « Contact » ; profil intervenant avec compétences en pastilles) ;
  27. bloc « En attendant » `#2B337A` (école) / `#1B1F3B` (intervenant), textes PC et mobile de la maquette, « Lire la charte des rencontres » (inactif) ;
  28. page « refusé » dans la même carte (rayon 28, pastille rouge) ;
  29. connexion : phrase de bas 13 px / 700.
  Le champ « Votre secteur » était déjà une liste déroulante obligatoire (valeurs exactes de l'énumération,
  libellés français centralisés dans `lib/referenceData.ts`, réutilisés par l'annuaire) : vérifié, inchangé.
- **F2 — comptes à valider** (W3-comptes) :
  1. texte d'aide sur `#DCE3EF` rayon 14, version mobile « Ce n'est pas une sélection : vérifiez l'identité, sans critère de qualité. » ;
  2. ligne de liste « ville · type » / « zone · 2 compétences » ;
  3. pastille de liste 11 px ;
  4. onglets 44 px, 14 px / 900 ;
  5. carte de détail rayon 24, padding 24 (22 / 18 mobile), sans ombre ;
  6. en-tête « {type} · demande envoyée le … » 13 px / 700 ; mobile « Envoyée le … » ;
  7. avatar 64 px rayon 20 (54 / 16 mobile) ;
  8. nom Lilita 28 (23 mobile) ;
  9. sous-titre « Lycée · Ville, Pays » / « Métier · Structure » 15 px / 800 ;
  10. faits dans des cases `#F7F3EA` rayon 14 (libellé 11 px / 900, valeur 15 px / 900) ;
  11. libellés « Type », « Fonction », « Zone » ;
  12. « Validé le / Refusé le » et « Délai » pour les comptes traités (calculés depuis `createdAt` et `decidedAt`) ;
  13. compétences `#1B1F3B`/`#FDE7A6` ;
  14. citation sur `#FDE7A6` entre « », puis « Pourquoi il ou elle veut transmettre » 12 px / 900 ;
  15. « Valider le compte » 54 px Lilita 19 ; « Refuser » bordure 2 px encre ;
  16. formulaire de refus dans un bloc `#F7F3EA` rayon 14, « Motif du refus » + « (transmis à la personne) », boutons 48 px ;
  17. résultat validé `#E8EEDF`/`#3B5221` : école « L'établissement accède maintenant à son tableau de bord et peut demander des rencontres. », intervenant « {Prénom} peut maintenant publier ses créneaux. » ;
  18. résultat refusé `#FBE3E3`/`#8E1518`, « Aucun motif transmis. » ;
  19. retour mobile en icône (« Retour à la liste ») + type du compte.
- **F3 — mon agenda** (W2-E8) :
  1. cellules 108 px rayon 12, bordure 1 px `#EDE6D6`, jour passé `#F1EBDD`, hors mois transparent ;
  2. aujourd'hui bordure 2 px et rond 26 px `#B8492A` ;
  3. pastilles « 10h00 · Libre », « 10h00 · 2 demandes », « 10h00 · Attente FM », « 10h00 · {ville} », « {ville} · annulée / refusée » (38 px, rayon 8, 12 px / 800, contour 3 px de sélection) ;
  4. « + Créneau » pointillé `#C9BFA8`, texte `#3B5221` 12 px / 900 (sélectionné `#E8EEDF`) ;
  5. légende 12 px / 800 gris, pastilles 14 px ;
  6. calendrier dans une carte blanche rayon 24, padding 20 ;
  7. mois précédent / suivant en boutons icône 44 px rayon 12 bordure `#E6DECB` ;
  8. bandeau des demandes : carte `#1B1F3B`, chiffre Lilita 30 `#FDE7A6`, « demandes d'écoles attendent votre réponse », « Répondre » (mobile « demandes à traiter ») ;
  9. heures affichées « 8h00 » ;
  10. format « En classe ou en ligne » (au lieu de « Les deux ») ;
  11. titre « Publier un créneau ce jour-là » Lilita 23, date dans l'en-tête du panneau ;
  12. message de succès sur `#E8EEDF`/`#3B5221` 14 px / 800 ;
  13. panneau blanc rayon 24, bordure 2 px de l'état, en-tête date + pastille (« Jour libre » pointillé vert) ;
  14. « Créneau libre · 10h00 – 11h30 » + format 14 px / 700 ; « Retirer ce créneau » 46 px rayon 14 ;
  15. créneau demandé : « 2 écoles demandent ce créneau » / « Une école demande ce créneau » / « Vous avez accepté, la Fondation M doit valider », demandes en cases `#F7F3EA` (pastille À traiter / Acceptée), note `#7A4100` ;
  16. rencontre : titre Lilita 23, « classe · élèves », Heure / Lieu, clôture et motif en bloc `#F7F3EA`, mot de l'école entre « » ;
  17. mobile : calendrier compact (jours 48 px, pastilles 9 px, jour libre à venir → publication), légende et « Touchez un jour libre pour publier un créneau. » ;
  18. mobile : panneau sous le calendrier (plus de liste des jours ni de vue plein écran).
- **F3 — demandes reçues** (W2-E9) :
  1. onglets tous comptés (40 px, 13 px / 900) ;
  2. cartes de liste rayon 18, bordure 2 px (sélection encre) ;
  3. créneau « Mar 24 nov · 10h00 » 12 px / 900 majuscules terracotta ;
  4. école Lilita 19, ligne 13 px / 700 ;
  5. « 2 demandes sur ce créneau » 12 px / 900 `#7A4100` ;
  6. pastille 11 px ;
  7. « Demande envoyée le 12 novembre » (sans l'année), mobile « Envoyée le … » ;
  8. école Lilita 28 (25 mobile), ville seule 14 px / 800 ;
  9. « Dans votre zone » `#DCE3EF`/`#2B337A` ;
  10. faits en cases `#F7F3EA` rayon 14, « Élèves » « 32 élèves » ;
  11. mot de l'école sur `#FDE7A6` entre « » ;
  12. créneau partagé : bordure 2 px `#EF7A0A` sur `#FDEBD3` (textes PC et mobile) ;
  13. « Accepter » 54 px Lilita 19, « Refuser » 54 px bordure encre ;
  14. refus : « Un mot pour expliquer ? » + « (transmis par la Fondation M) », placeholder de la maquette ;
  15. résultats « Merci, votre accord est enregistré », « Rencontre confirmée », « Vous avez refusé cette demande » + « Votre mot : « … » », « Refusée automatiquement · créneau pris », lien « Voir dans mon agenda » ;
  16. mobile : retour en icône (« Retour à la liste ») + « Demande de {école} ».
- **F4 — intervenants disponibles** (W1-E3) :
  1. recherche en boîte 48 px, rayon 14, bordure `#E6DECB`, loupe, à droite de l'en-tête (largeur 320) ; bouton « Rechercher » masqué (Entrée) ;
  2. filtres dans une carte blanche rayon 20, padding 18 ; libellés 12 px / 900 majuscules gris ;
  3. select Zone bordure 2 px `#2B337A` poids 800, Format poids 700, 44 px ;
  4. pastilles de secteur 40 px, 13 px ; active `#1B1F3B`/blanc poids 900 ;
  5. section carte rayon 24 ; partie carte sur `#DCE3EF`, padding 22 ;
  6. titre « Le réseau près de chez vous » Lilita 24 majuscules (mobile « Le réseau » 19) ;
  7. « {n} bénévoles au Sénégal » 14 px / 800 `#2B337A` ;
  8. libellé de la carte « Carte du Sénégal : 23 intervenants à Dakar, 7 à Thiès, … » ;
  9. panneau de ville : ville Lilita 28, ligne 14 px / 700, singulier « 1 bénévole prêt… », avatars 40 px rayon 12, « Choisir une ville » 12 px / 900, pastilles 36 px ;
  10. titres de section Lilita 24 majuscules + « · {n} intervenants » 15 px / 800 gris ;
  11. cartes rayon 22, padding 18 ; avatar 52 px rayon 16 ;
  12. secteur 11 px / 900 majuscules, nom Lilita 20, métier 13 px / 700, compétences 12 px / 800 ;
  13. « Prochain créneau » 12 px / 900 + créneau en pastille `#FDE7A6` rayon 10 ;
  14. bouton Lilita 17, 46 px, rayon 14 (« Demander » sur mobile) ;
  15. mobile : pastilles-filtres 40 px (zone `#2B337A`/`#FDE7A6`) ;
  16. mobile : bloc « Le réseau » `#DCE3EF` rayon 20 avec 4 avatars 32 px et « {n} bénévoles près de vous, à {ville} » ;
  17. mobile : « Autres zones » en lignes compactes avec bouton icône « Demander une rencontre avec {nom} ».
- **F4 — demander une rencontre** (W1-E4) :
  1. « Vous invitez » sur carte `#4E6A2C` rayon 24, avatar 72 px rayon 22 `#FDE7A6`/`#4E6A2C` ;
  2. « {Nom}, {métier} à {ville} » Lilita 26 (mobile : nom Lilita 21 + « Métier · Ville ») ;
  3. citation entre « », lien « Changer d'intervenant » crème ;
  4. étapes en cartes blanches rayon 22, padding 22 (sans carte sur mobile), légende Lilita 21 ;
  5. créneaux : radio visible 20 px, jour 12 px / 900 majuscules, date Lilita 22, heure 14 px / 800, bordure 3 px ;
  6. classes : ligne 56 px rayon 14, radio visible ;
  7. étape 4 sur `#FDE7A6` bordure 2 px `#E5A60A` ;
  8. récapitulatif « Intervenant : {Nom} · {métier} », « Lieu : En classe · {lieu} » ;
  9. « Un mot pour {Prénom} » + « (facultatif) », placeholder de la maquette ;
  10. pied : texte gris 14 px / 600, « Envoyer la demande » 60 px rayon 18 Lilita 22, « Annuler » en simple lien.
- **F5 — mes rencontres** (W1-E5, revérifié) :
  1. détail mobile : date en gras puis « classe · lieu » en gris, sans libellés visibles ;
  2. message mobile en ligne « **Titre.** texte ».

## Ce que F5 livre

- **Socle commun (maquette, toutes les personas)** :
  - barre latérale : logo Lilita 30, sous-titre 12 px majuscules, liens 44 px rayon 12 en 15 px (inactif
    poids 800, actif poids 900), pastilles 24 px, carte utilisateur rayon 16 avec avatar 44 px rayon 14 ;
    lien sobre « Se déconnecter » (14 px, poids 800) sous la carte ;
  - navigation basse mobile **blanche** (bordure haute `#E6DECB`, actif `#B8492A` poids 900, inactif
    `#4A4A57` poids 800, 11 px ; Fondation 10 px et 5 entrées), libellés courts, sans « Déconnexion » ;
  - plus d'en-tête mobile commun : chaque page a son en-tête (`components/layout/PageTitle.tsx`) ; sur
    mobile, l'avatar (44 px, rayon 14) ouvre un menu « Se déconnecter » (`components/layout/UserMenu.tsx`).
- **`/ecole/rencontres`** (« Mes rencontres », lecture seule), `?mois=AAAA-MM` et `?rencontre={id}` :
  - en-tête « Mon planning » / « Mes rencontres » et « Nouvelle demande » (bouton « + » sur mobile) ;
  - bandeau « Dans {n} jours · {Nom}, {métier}, rencontre vos {classe} {date} à {heure}. » + « Voir le
    détail » (PC) ; bandeau « Votre rencontre avec {intervenant} est terminée. » si un retour est à rédiger,
    « Partager mon retour » affiché « Bientôt » ;
  - calendrier PC (tableau, cellules 104 px, jours passés `#F1EBDD`, aujourd'hui bordure et rond
    `#B8492A`, une pastille-bouton « 10h00 · Awa » par rencontre, contour 3 px de sélection, légende) et
    calendrier compact mobile (un bouton par jour qui a des rencontres, pastille de statut, nombre s'il y
    en a plusieurs) ;
  - détail (`aria-live`) : à venir / passée, statut, intervenant et métier, date, classe, lieu, cases
    « Intervenant » et « Fondation M », message selon le statut, état du retour d'expérience, action ;
  - listes « À venir » et « Passées » (repliable sur PC).
- **Navigation école** : « Mes rencontres » active, pastille = rencontres PENDING ou CONFIRMED à venir.
- **Bandeau de refus de l'annuaire (F4)** : « Voir la demande » mène à la rencontre, sur le mois de son créneau.

## Ce que F4 livre

- **Thèmes de barre latérale par persona** (`components/layout/roleTheme.ts`, une seule table) appliqués
  à toutes les personas, F2 et F3 compris ; navigation basse de la même couleur que la barre latérale.
- **Navigation école** (sous-titre « Espace établissement ») : « Intervenants », « Mes rencontres »,
  « Retours d'expérience », « Mon établissement » (« Bientôt », sans page). Carte utilisateur : initiales et
  nom de l'établissement, « Établissement · {ville} ». Navigation basse : 5 entrées, pas de « Plus ».
- **`/ecole`** redirige vers **`/ecole/intervenants`** ; `/ecole/intervenants` et
  `/ecole/intervenants/{id}/demande` sont réservées au rôle SCHOOL.
- **`/ecole/intervenants`** (« Intervenants disponibles ») :
  - recherche (`q`), filtres « Zone » (select), « Secteur » (pastilles `aria-pressed`), « Format »
    (select), dans l'URL : `?zone=ma-zone|toutes|{ville}&secteur={SECTOR}&format=IN_PERSON|ONLINE&q=` ;
    sur téléphone, boutons-filtres qui ouvrent une feuille (Modal) ;
  - bandeau `role="status"` du dernier refus par un intervenant (14 jours), « Voir la demande » « Bientôt » ;
  - « Le réseau près de chez vous » : carte SVG de la maquette (cercles par ville, ville choisie en
    terracotta avec anneau), « {n} bénévoles au Sénégal », légende, panneau de la ville (jusqu'à
    4 personnes, « et {n} autres personnes »), pastilles « Choisir une ville » (villes hors carte comprises) ;
  - sections « À {ville} · {n} intervenants » puis « Autres zones · disponibles en ligne » ; cartes :
    avatar et libellé aux couleurs du secteur, nom, métier, 3 compétences, « Prochain créneau · Lun 30 nov ·
    9h30 », « {n} créneaux libres », « Demander une rencontre ».
- **`/ecole/intervenants/{id}/demande`** (« Demander une rencontre ») : fil d'Ariane (PC) ou « Retour aux
  intervenants » (téléphone), carte « Vous invitez » (citation = `motivation`), 4 blocs numérotés
  (« Quand ? », « Pour quelle classe ? » avec « Ajouter une classe », « Présentez vos élèves » avec le
  format, « Vérifiez votre demande » mis à jour en direct), « Envoyer la demande » / « Annuler »,
  écran « Demande envoyée ».

## Ce que F3 livre

- **Navigation intervenant** (sous-titre « Espace intervenant ») : « Mon agenda », « Demandes reçues »
  (pastille : demandes PENDING avec `myDecision` PENDING), « Mon impact » (« Bientôt », sans page). Carte
  utilisateur : deux initiales de `fullName`, « métier · ville » (e-mail à défaut). Navigation basse :
  4 entrées (« Mon impact » affichée désactivée, pas de « Plus » : la règle des 5 entrées n'est pas dépassée).
- **`/intervenant`** redirige vers **`/intervenant/agenda`** ; `/intervenant/agenda` et `/intervenant/demandes`
  sont réservées au rôle SPEAKER (gardes existantes).
- **Données** : `GET /api/speaker/slots?includePast=false` et `GET /api/speaker/meetings` (sans filtre),
  toutes les pages, une seule fois (`size=100` demandé ; la pagination suit le `totalPages` renvoyé si le
  serveur plafonne la taille ; 25 pages au plus, avertissement au-delà). L'agenda, le badge et les onglets
  partagent ces données ; elles sont rechargées (invalidation de `['speaker']`) après chaque action.
- **`/intervenant/agenda`** :
  - en-tête « Bonjour {prénom} », « Mon agenda » ; bandeau « {n} demandes d'écoles attendent votre
    réponse » avec « Répondre » (si n > 0) ;
  - PC / tablette (≥ 768 px) : calendrier mensuel (tableau, semaine du lundi, « Mois précédent / suivant »,
    `?mois=AAAA-MM`), un bouton par élément (heure + état en texte, libellé ARIA complet), « + Créneau »
    sur les jours à venir, légende ; panneau de détail à droite (≥ 1024 px) ;
  - téléphone : liste des éléments à venir groupés par jour, bouton « Publier un créneau » (le jour se
    choisit dans le formulaire), détail en plein écran avec « Retour » ;
  - panneau : jour (éléments du jour et formulaire si le jour est à venir), formulaire « Publier un
    créneau » (« De » / « À » au pas de 15 min, format « En classe / En ligne / Les deux »), créneau libre
    (« Retirer ce créneau » avec confirmation dans un Modal), créneau demandé (demandes, ma réponse, lien
    « Répondre »), rencontre (établissement, classe, horaire, format, lieu, mot de l'école, clôture et motif).
- **`/intervenant/demandes`** : onglets « À traiter · n », « Acceptées », « Refusées ou annulées »,
  « Toutes » (filtrés côté client, 20 par page, « Précédent / Suivant ») ; liste (créneau court, statut,
  établissement, « classe · n élèves · ville », « n demandes sur ce créneau ») et détail (date de la
  demande, « Dans votre zone », créneau, format souhaité, lieu, classe, nombre d'élèves, mot de l'école,
  avertissement « créneau partagé ») ; « Accepter » / « Refuser » (motif obligatoire) ; bloc de résultat ;
  mention de confidentialité. URL : `?onglet=a-traiter|acceptees|refusees|toutes`, `page=`, `demande={id}`.

## Ce que F2 livre

- **Navigation Fondation** (barre latérale PC, sous-titre « Pilotage du programme ») : « Tableau de bord »,
  « Comptes à valider » (pastille du nombre de comptes en attente, écoles + intervenants), « Demandes de
  rencontre », « Rencontres », « Retours d'expérience », « Requêtes donateurs ». Seule « Comptes à valider »
  est un lien ; les autres sont affichées avec « Bientôt », sans page. En bas : carte « Fondation M »
  (initiale « F ») avec l'e-mail du compte, puis « Se déconnecter ». Sur téléphone, navigation basse :
  « Comptes à valider », « Plus » (les 5 entrées « Bientôt ») et « Déconnexion ».
- **`/fondation`** redirige vers **`/fondation/comptes`**, réservée au rôle FOUNDATION par les gardes
  existantes (un autre rôle est renvoyé vers son accueil).
- **`/fondation/comptes`** → `GET /api/foundation/accounts?role=&status=&page=&size=20` :
  - onglets ARIA « Écoles · n », « Intervenants · n » (comptes PENDING) et « Déjà traités » ; texte d'aide
    sur l'onglet Intervenants ;
  - « Déjà traités » : deux groupes de pastilles envoyés au serveur, « Écoles / Intervenants » et
    « Validés / Refusés » (par défaut Écoles + Validés) ;
  - liste (pastille d'initiales indigo ou orange, nom, ligne de contexte, badge de statut) et détail
    (type · date de la demande, faits renseignés, compétences, motivation, actions ou bloc de résultat) ;
  - pagination « Précédent / Suivant » avec « Page x sur y » ;
  - URL : `?onglet=ecoles|intervenants|traites`, `type=ecoles|intervenants`, `decision=valides|refuses`,
    `page=` (à partir de 1), `compte={id}`. Sur téléphone, `compte` ouvre le détail en plein écran avec
    « Retour » ; le retour du téléphone le referme. Un compte absent de la page chargée → la liste.
- **Valider** → `POST /api/foundation/accounts/{id}/validate` (sans corps ni confirmation, bouton en
  chargement). **Refuser** → `POST /api/foundation/accounts/{id}/reject` avec `{ reason }` (motif obligatoire).
- Après une action réussie : bloc « Compte validé » / « Compte refusé » (avec « Décision du {date} »),
  sélection du compte suivant, cache `['foundation','accounts']` invalidé (listes, compteurs et badge
  rechargés depuis le serveur).

## Ce que F1 livre

- **`/inscription`** : choix du type de compte (deux cartes : établissement en terracotta, intervenant
  en orange), lien « Déjà un compte ? Se connecter ». Le lien « Pas encore de compte ? » de la
  connexion y mène.
- **`/inscription/ecole`** → `POST /api/auth/register/school` et **`/inscription/intervenant`** →
  `POST /api/auth/register/speaker` : deux colonnes sur PC (colonne de la couleur du rôle avec 3 étapes),
  bandeau sur téléphone, onglets « Se connecter » / « Créer un compte », groupes de champs, suggestions
  (datalist) pour le pays et la ville, charte obligatoire, compétences en pastilles à bascule avec ajout libre.
- **Après inscription (201)** : connexion automatique (`POST /api/auth/login` avec les mêmes identifiants),
  `GET /api/me`, puis `/compte-en-attente`. Si la connexion automatique échoue : `/connexion` avec
  « Compte créé. Connectez-vous pour suivre votre demande. »
- **`/compte-en-attente`** (PENDING seulement) : en-tête blanc (logo, nom, « Se déconnecter »), pastille
  « Compte en attente », « Merci {nom}, votre demande est bien arrivée », frise en 4 étapes avec la date
  de `createdAt`, récapitulatif tiré de `/api/me`, bloc « En attendant », bouton « Actualiser mon statut »
  (relit `/api/me` ; redirection vers l'accueil si le compte est validé).
- **`/compte-refuse`** (REJECTED seulement) : pastille « Demande refusée », motif `rejectionReason` dans un
  bloc « Motif indiqué par la Fondation M », adresse de contact, « Se déconnecter ».
- **`/mot-de-passe-obligatoire`** (`mustChangePassword` seulement) : mot de passe actuel, nouveau,
  confirmation (vérifiée côté client) → `POST /api/me/password` ; le nouveau jeton remplace l'ancien,
  `/api/me` est relu, puis redirection vers l'accueil du rôle.
- Aucun texte ne promet d'e-mail : le backend n'en envoie pas.

## Ce que F0 livre

- **Connexion** (`/connexion`) : e-mail + mot de passe, validation Zod, erreurs du serveur sous les
  champs, messages dédiés (identifiants invalides, trop de tentatives, serveur injoignable, délai dépassé).
- **Aiguillage après connexion** selon `GET /api/me` : PENDING → `/compte-en-attente`,
  REJECTED → `/compte-refuse` (avec `rejectionReason`), `mustChangePassword` → `/mot-de-passe-obligatoire`
  (page provisoire), sinon l'accueil du rôle : `/ecole`, `/intervenant`, `/fondation`, `/donateur`, `/eleve`.
- **Gardes** : sans jeton → connexion ; mauvais rôle → accueil de son rôle ; statut ou mot de passe à
  changer → page correspondante.
- **Session** : déconnexion (jeton + cache TanStack Query) ; 401 → déconnexion automatique et
  « Session expirée », sauf sur `POST /api/auth/login`.
- **403 `PASSWORD_CHANGE_REQUIRED` / `ACCOUNT_NOT_VALIDATED`** sur n'importe quel appel : relecture de
  `/api/me` puis redirection vers la page adaptée.
- **Réveil du serveur** : bandeau après 5 s, abandon à 90 s avec « Réessayer ».
- **Composants** : Button, Input, PasswordInput, Select, Textarea, FormField, Card, Badge, Alert, Spinner,
  EmptyState, ErrorState, PageHeader, Modal ; mise en page avec barre latérale (≥ 1024 px) et navigation
  basse (mobile).
- **Jetons de design** : `fondationm-web/src/styles/theme.css`, extraits de la maquette « Marché »
  (voir décision 10).
- **Connexion au design de la maquette** : deux colonnes sur PC (colonne terracotta + carte blanche),
  une colonne sur téléphone (< 768 px) avec bandeau terracotta et carte qui le chevauche.

## Décisions prises

1. **Pas de proxy Vite** : appel direct de `VITE_API_URL`. Port 5173 imposé (seule origine autorisée
   par le CORS du backend).
2. **Types de l'API** générés depuis `openapi.json` (racine du dépôt) vers `src/api/schema.d.ts`, versionné.
3. **openapi-typescript via `npx`** (écart avec l'accord initial `--legacy-peer-deps`) : TypeScript 7
   n'expose plus l'API JavaScript du compilateur. Vérifié : avec `--legacy-peer-deps`, la génération
   plante (`createKeywordTypeNode` indéfini) ; les `overrides` npm ne lèvent pas le conflit de
   peer-dependency ; aucune version d'openapi-typescript n'accepte TypeScript 7. Le script exécute
   `openapi-typescript@7.13.0` avec `typescript@5.9.3` dans un environnement `npx` isolé (versions épinglées,
   rien dans `package.json`).
4. **Erreurs** : normalisation défensive dans `api/errors.ts`. Corps absent → code déduit du statut ;
   échec de `fetch` sans réponse → `NETWORK_ERROR` ; délai dépassé → `TIMEOUT` ; tout 429 → `RATE_LIMITED` ;
   toute autre exception → `UNEXPECTED_ERROR`. Messages
   français pour les codes connus ; pour un code inconnu, le message du serveur est affiché tel quel.
5. **Pas de nouvelle tentative automatique** (TanStack Query `retry: false`) : le délai de 90 s couvre le
   réveil du serveur, et l'utilisateur garde la main avec « Réessayer ».
6. **Nom affiché** : `schoolName` (SCHOOL), `fullName` (SPEAKER), `firstName lastName` (STUDENT),
   `name` (DONOR) ; e-mail à défaut (FOUNDATION a `profile: null`).
7. **Lint** : oxlint conservé, catégories `correctness` et `suspicious` en erreur, `any`, `console` et
   assertions non nulles interdits, règles React, import et jsx-a11y ; `--deny-warnings`.
   `react-in-jsx-scope` (obsolète avec le runtime JSX automatique) et `prefer-tag-over-role` sont désactivées.
8. **Tests** : `fetch` simulé par `vi.stubGlobal` (pas de MSW), aucun appel réseau réel. Les jetons et
   mots de passe des tests sont des valeurs factices explicites.
9. **Dépendances ajoutées au-delà de la liste B2, avec accord** : `jsdom`, `@testing-library/jest-dom`,
   `@testing-library/user-event`, `@hookform/resolvers`.
10. **Design : tokens extraits de la maquette « Marché »** (couleurs, rayons, polices), centralisés dans
    `src/styles/theme.css`.
    - Couleurs : fond `#F7F3EA`, texte `#1B1F3B`, texte secondaire `#4A4A57`, bordure `#E6DECB`,
      terracotta `#B8492A` / `#8F3720`, indigo `#2B337A`, crème-jaune `#FDE7A6`, jaune `#E5A60A`,
      vert `#4E6A2C`, rouge `#B81C1F`, orange `#EF7A0A`, blanc `#FFFFFF`.
    - Rayons : champs 12 px, boutons 16 px, blocs internes 20 px, cartes 28 px, pastilles 999 px.
    - Polices : Lilita One (titres, chiffres clés, gros boutons), Nunito 400 à 900 (reste).
    - Contrastes vérifiés (texte ≥ 4,5:1). Un seul couple échoue : crème-jaune sur terracotta (4,26:1).
      Le texte crème posé sur terracotta utilise donc `cream-soft` `#FFF0C4` (4,60:1) ; la crème
      d'origine reste utilisée sur indigo (9,24:1) et sur terracotta foncé (6,27:1).
    - Teintes claires dérivées pour les fonds d'alerte (texte ≥ 5,2:1) : `#FBE4DC`, `#E3E5F5`,
      `#E8EFDC`, `#FBE3E3`.
    - La bordure des champs `#E6DECB` sur blanc (1,34:1) suit la maquette ; au focus, bordure
      terracotta et anneau.
    - F1 : texte `#1B1F3B` sur orange (5,71:1 ; le blanc échouerait à 2,82:1), crème-jaune sur `#1B1F3B`
      (13,14:1), légendes terracotta sur blanc (5,22:1).
11. **Inscription sans jeton** : le contrat renvoie un `MeResponse` (201), pas de jeton ; la connexion
    automatique passe donc par `POST /api/auth/login`.
12. **Champs obligatoires côté client, plus stricts que le contrat (volontaire)** : ils servent à la
    validation par la Fondation et au filtrage de l'annuaire.
    - Établissement : nom, type, pays, ville, fonction du référent, e-mail, téléphone, mot de passe, charte.
      Le contrat n'exige que `email`, `password`, `schoolName`, `city`, `country`.
    - Intervenant : nom, métier, secteur, pays, ville, au moins une compétence (20 max, 100 caractères
      chacune), e-mail, téléphone, mot de passe, charte. Facultatifs : structure et motivation (non
      envoyés s'ils sont vides). Le contrat exige `email`, `password`, `fullName`, `city`, `country`, `skills`.
    - Téléphone : motif du contrat `[0-9 +().\-]{6,30}`.
13. **Charte** : case obligatoire côté client ; `charterAccepted: true` toujours envoyé (le contrat
    ne l'exige pas).
14. **Mot de passe** : règles du contrat, 8 à 72 caractères, sans exigence de chiffre. Aide affichée :
    « 8 caractères minimum ». Au changement, le nouveau doit différer de l'actuel (vérifié aussi côté client).
15. **Compétences** envoyées dans la requête d'inscription (`skills`) ; `PUT /api/speaker/profile/skills`
    n'est pas appelé.
16. **Erreurs du serveur dans les formulaires** (`lib/serverFieldErrors.ts`) : chaque `fieldErrors` va sous
    son champ (le premier reçoit le focus). Sans `fieldErrors`, un 409 ou un code contenant « EMAIL » va sous
    le champ e-mail. Sinon, alerte au-dessus du bouton.
17. **Gardes** : `/inscription/*` publiques (utilisateur connecté → son accueil) ; `/compte-en-attente`,
    `/compte-refuse` et `/mot-de-passe-obligatoire` n'acceptent que le statut correspondant. Priorité
    inchangée : PENDING / REJECTED avant `mustChangePassword`.
18. **Build** : le bundle dépassait 500 kB ; les dépendances sont séparées en deux chunks (`react`,
    `vendor`) via `build.rolldownOptions.output.codeSplitting` dans `vite.config.ts`.
19. **Lecture défensive partagée** : `api/wire.ts` (null, absent ou type inattendu → absent) et
    `lib/profiles.ts` (profils école / intervenant) servent à `/api/me` et à `AccountResponse`. Un compte
    sans `id`, sans statut ou d'un rôle autre que SCHOOL / SPEAKER est ignoré dans la liste.
20. **Compteurs** : « Écoles · n », « Intervenants · n » et le badge de la navigation viennent du
    `totalElements` de la première page PENDING de chaque rôle (requêtes partagées avec la liste).
21. **Motif de refus** obligatoire côté client : 1 à 1000 caractères après retrait des espaces (le motif
    envoyé est le texte sans espaces de début et de fin). Erreur `fieldErrors` du serveur sous le champ.
22. **Compte déjà traité** : tout 409 sur la validation ou le refus affiche « Ce compte a déjà été traité »
    (le message du serveur n'est pas repris) et recharge les listes.
23. **Après une action** : le bloc de résultat du compte traité s'affiche en tête du détail, et la sélection
    passe au compte suivant de la page (ou au précédent s'il était le dernier). Si la page courante dépasse
    la dernière page après rechargement, retour automatique à la dernière page existante.
24. **Pas de `GET` d'un compte seul dans le contrat** : le détail vient de la page de liste chargée.
25. **Tests** : délai des attentes asynchrones de Testing Library porté à 4 s et délai par test à 15 s
    (`src/test/setup.ts`, `vite.config.ts`) : sous charge, la suite complète en parallèle dépassait
    ponctuellement 1 s au premier rendu d'un fichier.
26. **Dates et fuseau** : affichage dans le fuseau du navigateur (`lib/dateTime.ts`, « Mardi 24 novembre,
    10h00 – 11h30 ») ; les créneaux sont envoyés avec le décalage du navigateur
    (`2026-11-25T10:00:00+01:00`). Les tests fixent `TZ=Africa/Lagos` (UTC+1, sans heure d'été) et la date
    du jour (`vi.setSystemTime`).
27. **Statuts de l'agenda** : un élément par créneau, rencontres rattachées par `slot.id`. Priorité :
    Confirmé (une rencontre CONFIRMED) > Réalisé (COMPLETED) > Demandé (au moins une PENDING) > Libre
    (créneau AVAILABLE) > Annulé ou refusé (seulement des rencontres REFUSED / CANCELLED). Un créneau libre
    dont des demandes ont été refusées reste « Libre ». Chaque état a une couleur et un libellé texte.
28. **Créneau côté client** : jour à venir, début à venir, fin après le début, durée de 15 min à 8 h, dans
    la journée (débuts de 00:00 à 23:30, fins de 00:15 à 23:45, pas de 15 min). Les listes d'heures ne sont
    pas filtrées selon le début : la règle de durée est signalée sous « À ».
29. **Onglets des demandes** : « À traiter » = PENDING + `myDecision` PENDING ; « Acceptées » = PENDING +
    `myDecision` VALIDATED, CONFIRMED, COMPLETED ; « Refusées ou annulées » = REFUSED, CANCELLED ;
    « Toutes ». Tri par date du créneau.
30. **Motif du refus d'une demande** : obligatoire, 1 à 500 caractères après retrait des espaces (« Un mot
    pour expliquer ? » avec astérisque). Formulaire de motif commun avec le refus de compte (F2) :
    `components/ui/ReasonForm.tsx`.
31. **« Dans votre zone »** : même ville ET même pays que l'intervenant (`/api/me`), sans tenir compte des
    majuscules ni des accents.
32. **Erreurs** : `SLOT_OVERLAP` → « Ce créneau chevauche un de vos créneaux existants. » sous le formulaire ;
    `SLOT_HAS_PENDING_MEETINGS` / `SLOT_NOT_AVAILABLE` → message dédié dans le panneau ; sur une demande,
    `SLOT_PASSED` → « Ce créneau est déjà passé. », tout autre 409 → « Cette demande a déjà été traitée. »,
    avec rechargement ; `fieldErrors` sous le champ (`startAt` / `endAt` → « De » / « À », `reason`).
33. **Invite « Partager mon retour »** omise : l'information demanderait un appel supplémentaire
    (`/api/speaker/feedbacks/awaiting`).
34. **Navigation** : les compteurs sont fournis par `nav/badges.ts` (la mise en page n'importe plus de
    page). Regroupement sous « Plus » seulement si la navigation basse dépasse 5 entrées (Fondation).
35. **Tests** : `<dialog>` (`showModal` / `close`) simulé dans `src/test/setup.ts`, jsdom ne l'implémentant pas.
36. **Thèmes par persona** (`components/layout/roleTheme.ts`) : barre latérale, navigation basse, lien
    actif, pastille de compteur, carte utilisateur et avatar. Contrastes vérifiés (texte ≥ 4,5:1) :
    - École : crème sur indigo 9,24 ; actif blanc sur terracotta 5,22 ; pastille encre sur orange 5,71 ;
      carte crème / blanc sur encre 13,14 / 16,08 ; avatar indigo sur crème 9,24.
    - Intervenant : encre sur orange 5,71 ; actif crème sur encre 13,14 ; pastille encre sur blanc 16,08.
    - Fondation : blanc sur terracotta 5,22 ; actif 13,14 ; pastille encre sur crème 13,14 ; carte blanc /
      crème sur `#8F3720` 7,68 / 6,27 ; **avatar terracotta `#B8492A` sur crème `#FDE7A6` : 4,26 (échec,
      couleur conservée, voir point ouvert 16)**.
    - Donateur : blanc sur vert 6,14 ; carte blanc / crème sur `#3B5221` 8,70 / 7,11 ; avatar vert sur crème 5,01.
    - Élève : encre sur jaune 7,50 ; actif 13,14 ; carte 13,14.
    Les entrées « Bientôt » gardent la couleur du texte (plus d'opacité réduite, qui faisait chuter le contraste).
37. **Couleurs par secteur** (`pages/school/sectorStyle.ts`) : contrastes tous ≥ 4,5:1 (avatars 5,01 à
    9,24 ; libellés sur blanc 5,65 à 11,31 et sur `#F7F3EA` ≥ 5,10). Les 5 secteurs sans couleur dans la
    maquette (BTP et industrie, Commerce, Éducation, Arts et médias, Autre) : avatar encre / crème, libellé encre.
38. **Zones de l'annuaire** : « ma zone » = deux requêtes, `city` + `country` de l'école, puis
    `format=ONLINE` sans ville (intervenants de ma ville exclus côté client, comparaison sans casse ni
    accents) ; la seconde section disparaît si « Format » vaut « En classe ». « Toutes les zones » : une
    liste sans filtre de ville ; une ville choisie : une liste filtrée par cette ville (et son pays, pris
    dans les statistiques). Toutes les pages sont chargées (`size=100`, 25 pages au plus). Sans ville
    d'école connue, « Toutes les zones » par défaut.
39. **Un seul créneau par carte** (`nextSlotStartAt` + `availableSlotsCount`), sans format : l'annuaire ne
    renvoie ni la liste des créneaux ni leurs formats (écart ; aucun appel par intervenant).
40. **Classes** : « Ajouter une classe » dans l'étape 2 (intitulé 1–100, filière 1–100, effectif 1–500 ;
    `POST /api/school/classes`), classe créée sélectionnée automatiquement. Ce n'est pas un `<form>`
    (imbriqué dans le formulaire de demande) : Entrée dans ses champs ajoute la classe.
41. **Formulaire de demande** : créneau et classe obligatoires ; format imposé par le créneau
    (IN_PERSON / ONLINE) ou à choisir (BOTH, pastilles « En classe / En ligne », sans valeur par défaut),
    toujours envoyé ; lieu obligatoire « En classe » (1–150), facultatif en ligne ; message facultatif
    (1000 max). Lieu et message vides ne sont pas envoyés (`minLength: 1` du contrat).
42. **Bandeau de refus** : rencontre REFUSED la plus récente avec `closedBy=SPEAKER` et `refusedAt` de
    14 jours au plus (`GET /api/school/meetings?status=REFUSED`, toutes les pages). Pas de mémoire « déjà vu ».
43. **Erreurs de la demande, par code quel que soit le statut HTTP** : `SLOT_NOT_AVAILABLE`, `SLOT_PASSED`
    (message dédié, sélection retirée, créneaux rechargés), `CLASS_SLOT_OVERLAP`, `CLASS_FULL` (messages
    dédiés), `STUDENT_COUNT_TOO_LOW` (message du serveur, seuil inconnu) ; tout autre code : message du
    serveur ; `fieldErrors` sous les champs (`slotId`, `classId`, `format`, `place`, `message`).
44. **Carte** : SVG de la maquette repris tel quel (`viewBox="-24 -6 410 284"`, polygones, textes, table des
    8 villes dans `pages/school/mapCities.ts`). Rayon `min(21, 7,5 + 2,8·√n)` ; nombre en 14 / 11 / 10
    selon le rayon ; étiquettes 900 / 12 (Dakar, Saint-Louis) ou 800 / 11, agrandies à 15 / 14 sous 768 px.
    Comptes tirés de `byCity` (Sénégal ou pays vide) ; villes absentes de la table : pastilles seulement.
    La carte est une image (`role="img"`, libellé listant les villes) ; le choix de ville passe par les pastilles.
45. **Tests** : `mockApi` répond par défaut (listes vides) à l'annuaire, aux statistiques et aux rencontres
    de l'école, pour les tests de gardes qui aboutissent sur `/ecole` ; les tests de l'école les remplacent.
46. **Fin de session** : `endSession` efface le jeton et annule les requêtes ; `RequireAuth` vide le cache
    quand l'espace connecté se démonte (voir « Corrections »).
47. **Statuts de « Mes rencontres »** (maquette W1-E5) : En attente `#EF7A0A`/`#1B1F3B` (5,71), Confirmée
    `#4E6A2C`/blanc (6,14), Réalisée `#2B337A`/`#FDE7A6` (9,24), Refusée `#B81C1F`/blanc (6,51), Annulée
    `#E6DECB`/`#1B1F3B` (12,00). Cases de validation : Validé `#3B5221`/`#E8EEDF` (7,34), En attente
    `#7A4100`/`#FDEBD3` (6,97), Refusé `#8E1518`/`#FBE3E3` (7,57). Retour : À rédiger `#E5A60A`/`#1B1F3B`
    (7,50), Soumis `#9DAA3C`/`#1B1F3B` (6,32), Validé `#4E6A2C`/blanc (6,14). Jour passé `#4A4A57` sur
    `#F1EBDD` (7,34) ; aujourd'hui blanc sur `#B8492A` (5,22).
48. **Rencontres passées non atténuées** : l'`opacity: 0.8` de la maquette fait chuter le contraste (En
    attente 3,75:1, Confirmée 4,00:1). Elle n'est pas appliquée ; le fond `#F1EBDD` du jour et « passée »
    dans le libellé ARIA marquent la rencontre passée.
49. **Données de « Mes rencontres »** : `GET /api/school/meetings` sans filtre, toutes les pages
    (`size=100`, 25 pages au plus), partagé par le calendrier, les listes, la pastille de navigation et le
    bandeau de refus de F4 (la requête `status=REFUSED` de F4 est supprimée). Retours :
    `GET /api/school/feedbacks/awaiting` (« À rédiger ») et `GET /api/school/feedbacks` (SUBMITTED →
    « Soumis », PUBLISHED → « Validé »), toutes les pages. Métier : `GET /api/school/speakers/{id}` pour la
    rencontre sélectionnée et celle du bandeau, omis si la fiche est introuvable (404).
50. **Cases « Intervenant » / « Fondation M »** déduites du statut (pas de décision par partie dans le
    contrat) : PENDING → En attente / En attente ; CONFIRMED, COMPLETED → Validé / Validé ; refus par
    l'intervenant → Refusé / « — » ; refus par la Fondation → « — » / Refusé ; créneau pris → « — » / « — » ;
    annulée → Validé / Validé si `confirmedAt` existe, sinon « — » / « — ».
51. **Textes des messages** : ceux de la maquette (Tout est prêt, Demande envoyée, Refusée par l'intervenant
    + motif, Annulée par la Fondation M + motif, Comment cela s'est-il passé ?, Merci pour votre retour, Une
    belle rencontre) ; cas absents validés : « Refusée par la Fondation M » / {motif}, « Créneau pris » /
    « Ce créneau a été attribué à une autre classe. » (`pages/school/meetingText.ts`).
52. **Calendrier partagé** : `components/calendar/MonthTable.tsx` (tableau accessible, semaine du lundi,
    `caption`, en-têtes `abbr`, `aria-current="date"`) et `lib/calendar.ts` servent l'agenda F3 et « Mes
    rencontres ». Sélection : l'URL (`rencontre`), sinon la prochaine rencontre, sinon la plus récente.
53. **Navigation (remplace les décisions 34 et 36 pour le mobile)** : navigation basse blanche commune ;
    libellés courts (`NavItem.short`) ; Fondation : 5 entrées (« Requêtes donateurs » absente du mobile,
    comme la maquette) ; plus de menu « Plus ». Les entrées sans écran restent « Bientôt », non cliquables.
    Les pastilles de la navigation basse sont `#B8492A`/blanc (5,22), la maquette n'en montrant pas.
54. **Barres latérales (maquette)** : table `components/layout/roleTheme.ts` mise à jour — texte inactif
    école `#F7F3EA`, intervenant `#1B1F3B`, Fondation blanc ; avatars de carte : école `#E5A60A`/`#1B1F3B`
    (7,50), intervenant `#2B337A`/`#FDE7A6` (9,24), Fondation `#FDE7A6`/`#B8492A` (**4,26, échec signalé**),
    donateur `#FDE7A6`/`#4E6A2C` (5,01) ; détail de la carte en `#F7F3EA`.
55. **Carte utilisateur** : école = nom de l'établissement + ville ; Fondation = « Fondation M » + « Équipe du
    programme » (avatar « F ») ; intervenant inchangé (nom + « métier · ville »).
56. **Corrections de conformité appliquées dans F5** : D1 (couleurs des états de l'agenda), E2 (pastilles des
    demandes), E5 (« Accepter » terracotta, « Refuser » bordure encre), B2 (bandeau de refus), C2 (numéros
    d'étape carrés indigo), F2 (liste des comptes).
57. **F5.1 — composants partagés** : `components/calendar/MonthNav.tsx` (mois précédent / suivant en icônes,
    agenda et « Mes rencontres ») ; `Badge` (tailles `sm` 11 px / `md` 12 px), `Tabs` (`md` 44 px / `sm` 40 px),
    `ChoiceGroup` (`look="filter"`), `FormField` (`labelNote` « (facultatif) », `hintTone`), `Initials`
    (`list` 46 px, `detail` 64 px), `SpeakerAvatar` (carrés arrondis), `AccountStatusLayout` (en-tête de la maquette).
58. **Agenda mobile** : calendrier compact (`pages/speaker/AgendaCompact.tsx`) ; un jour avec un élément sélectionne
    le premier, un jour libre à venir ouvre la publication ; le panneau de détail est sous le calendrier.
59. **Pastilles de l'agenda Confirmé / Réalisé** : la maquette n'affiche que « heure · ville » ; l'état reste écrit
    sur une seconde ligne (jamais la couleur seule, accessibilité inchangée).
60. **Comptes traités** : « Validé le / Refusé le » et « Délai » (jours entre `createdAt` et `decidedAt`) dans les
    faits, comme la maquette ; la date ne figure plus dans le bloc de résultat.
61. **Connexion par persona** : cinq pages, un seul formulaire (`LoginForm`) et un seul appel ; la page ne
    décide de rien, la redirection suit le rôle de `/api/me` (gardes inchangées).
62. **Identifiant élève** : convention `{identifiant}@eleve.fondationm.sn` côté client (décision de l'équipe,
    point ouvert 20) ; une saisie avec « @ » part telle quelle.
63. **Dernier rôle en mémoire vive** (`auth/lastRole.ts`) : pas de stockage d'une information de session en
    plus du jeton ; un rechargement complet ramène à `/connexion`.
64. **Pays / Zone** : listes fermées (`lib/places.ts`, une seule orthographe pour l'inscription et la carte) ;
    Zone libre hors Sénégal faute de villes dans la maquette ; pas d'« Autre ».
65. **Bouton encre / crème** : variante `ink` de `Button` (connexion élève).

## Écarts

- `--legacy-peer-deps` remplacé par l'exécution `npx` isolée (voir décision 3).
- La navigation des rôles donateur et élève ne contient que « Accueil » : les entrées viendront avec
  leurs écrans.

## Écarts maquette / backend

| Élément de la maquette | Situation dans le contrat | Choix frontend |
| --- | --- | --- |
| « Prénom et nom » du référent d'établissement | Absent de `RegisterSchoolRequest` et de `SchoolProfileResponse` | Champ non affiché ; « Merci {nom de l'établissement} » sur la page d'attente. **À ajouter côté backend plus tard.** |
| Lien « Lire la charte » | Aucun texte de charte n'existe ; la maquette ne le montre que sur la page d'attente (« Lire la charte des rencontres ») | Affiché inactif sur la page d'attente de l'école, retiré des formulaires d'inscription |
| Lien « Modifier » de la page d'attente | Aucun point d'accès de modification pour un compte en attente | Non affiché |
| Case « Rester connecté », lien « Mot de passe oublié » (connexion) | Pas de point d'accès | Non affichés |
| Encadré « Ce trimestre · 1 240 jeunes » (W3, W4) | Aucune donnée publique d'impact avant connexion | Non affiché : la colonne s'arrête au texte |
| « Identifiant » de l'élève (W5, « khadija.ba.sor ») | `LoginRequest` n'a que `email` ; un élève est créé avec un e-mail | Convention `{identifiant}@eleve.fondationm.sn` (point ouvert 20) |
| Motif de refus « facultatif » (maquette) | `RejectAccountRequest.reason` : ni obligatoire ni de longueur minimale (`minLength: 0`, `maxLength: 1000`) | Obligatoire côté client (1 à 1000 caractères). **Le backend devrait l'exiger ou le documenter.** |
| « Délai » de traitement d'une demande | Absent du contrat | Non affiché |
| Date et auteur de la décision | `decidedAt` fourni ; aucun auteur | « Décision du {date} » ; pas d'auteur |
| « Un e-mail de bienvenue lui a été envoyé » | Le backend n'envoie aucun e-mail | Phrase retirée |
| Code d'erreur « compte déjà traité » | Non documenté (aucune réponse d'erreur dans le contrat) | Tout 409 traité comme « déjà traité » (décision 22). Code vraisemblable : `INVALID_STATUS_TRANSITION` (HTTP 409), non documenté |
| Ordre de la liste des comptes | Non précisé (pas de paramètre de tri) | Ordre du serveur |
| Motif du refus d'une demande « facultatif » (maquette) | `ReasonRequest.reason` : clé obligatoire mais `minLength: 0`, `maxLength: 500` | Obligatoire côté client (1 à 500 caractères) |
| Règles d'un créneau (durée 15 min – 8 h, début à venir, pas de chevauchement) | Absentes de `CreateSlotRequest` (deux chaînes `startAt` / `endAt`) | Vérifiées côté client (décision 28) ; le serveur reste juge |
| Codes `SLOT_OVERLAP`, `SLOT_NOT_AVAILABLE`, `SLOT_HAS_PENDING_MEETINGS`, `INVALID_STATUS_TRANSITION`, `SLOT_PASSED` | Réellement renvoyés (HTTP 409) mais absents du contrat | Messages dédiés (décision 32) |
| Filière de la classe | Absente de `ClassInfo` (`title`, `studentCount`) | Non affichée |
| « Dans votre zone » | Aucun champ | Calculé : ville et pays de l'école = ceux de l'intervenant |
| Format du créneau dans une rencontre | `SpeakerMeetingResponse` ne donne que le format choisi (`format`) et `place` | Format choisi et lieu affichés |
| Invite « Partager mon retour » | Pas d'indicateur dans les rencontres ; seulement `/api/speaker/feedbacks/awaiting` | Omise (décision 33) |
| Agenda d'un mois donné | Pas de filtre par période sur les créneaux ni sur les rencontres | Toutes les pages chargées une fois (point ouvert 9) |
| Créneaux libres passés | `includePast=false` par défaut | Non chargés ; les rencontres passées restent visibles |
| Filtre « Date » de l'annuaire (téléphone) | Aucun filtre par date sur `GET /api/school/speakers` | Bouton omis |
| « Ma zone d'abord » | Aucun tri documenté | Deux requêtes (décision 38) |
| « Prochains créneaux · {format} » (2 créneaux) sur chaque carte | L'annuaire ne renvoie que `nextSlotStartAt` et `availableSlotsCount` | Un créneau, sans format (décision 39). **Backend : prochains créneaux et formats dans l'annuaire.** |
| Surtitre « Disponibles surtout en ligne » du panneau de ville | Aucun format dans les statistiques ni dans l'annuaire | Omis ; « Votre zone » ou « Autre zone · en ligne possible » |
| Position des villes sur la carte | Aucune coordonnée dans `CityCount` | Table de la maquette (8 villes) ; autres villes en pastilles seulement |
| Citation de présentation de l'intervenant | `motivation` | Affichée si renseignée |
| Prénom et nom du référent (carte utilisateur) | Absents (déjà noté) | Initiales et nom de l'établissement |
| Lien « Voir la demande » du bandeau de refus | « Mes rencontres » pas encore livré | Affiché désactivé, « Bientôt » |
| Classe : intitulé | `CreateClassRequest.title` accepte une chaîne vide (`minLength: 0`) | Obligatoire côté client (1–100) |
| Classe : filière | `fieldOfStudy` existe côté école (absent de `ClassInfo` côté intervenant) | Demandée à la création, non affichée dans le choix |
| Codes d'erreur de `POST /api/school/meetings` | Aucun dans le contrat ; statut HTTP non garanti | Traités par code (décision 43) |
| Libellé « SÉNÉGAL » de la carte (`#B8AE98` sur `#F7F3EA`) | — | Contraste 1,99:1, couleur conservée (point ouvert 16) |
| Cases « Intervenant » / « Fondation M » (W1-E5) | Pas de décision par partie dans `SchoolMeetingResponse` | Déduites du statut (décision 50) ; « Presque confirmée » (intervenant d'accord, Fondation en attente) impossible |
| Métier de l'intervenant (W1-E5) | Absent de `SpeakerInfo` | Lu dans la fiche `GET /api/school/speakers/{id}` (décision 49), omis si 404 |
| « Partager mon retour » (W1-E5, bandeau, cellule, détail) | « Retours d'expérience » pas encore livré | Affiché « Bientôt », non cliquable (cellule : « Partager mon retour · Bientôt ») |
| Atténuation des rencontres passées (`opacity: 0.8`) | — | Non appliquée : contraste 3,75 et 4,00 (décision 48) |
| Liste « Passées » sur PC | Absente de la maquette PC | Ajoutée sous « À venir », repliable |
| Lignes des listes mobiles (W1-E5) | Maquette mobile : « Mar 17 nov. · {classe} » sans l'heure | Même format que le PC, heure comprise |
| Déconnexion | Absente de la maquette (barre latérale et navigation basse) | PC : lien sous la carte ; mobile : avatar de l'en-tête → menu « Se déconnecter » |
| Avatar d'en-tête mobile | Absent de la maquette sur W3-comptes, W2-E9, W1-E4, W1-E5 (bouton « + ») | Ajouté sur ces pages pour la déconnexion |
| Entrées de navigation sans écran | La maquette les montre actives, avec pastilles | « Bientôt », non cliquables |
| Pastilles de la navigation basse | Absentes de la maquette mobile | Conservées (`#B8492A`/blanc) |
| « Requêtes donateurs » (Fondation) sur mobile | Absente de la navigation basse de la maquette (5 entrées) | Absente aussi |
| Carte utilisateur école / Fondation | Maquette : nom du référent, « Samirath · Chargée de programme » | Établissement + ville ; « Fondation M » + « Équipe du programme » (données absentes) |
| Code d'erreur « e-mail déjà utilisé » | Non documenté (aucun 409 ni code dans le contrat) | Règle de la décision 16. Code réellement observé : `EMAIL_ALREADY_USED` (HTTP 409, message « Cette adresse e-mail est déjà utilisée. ») |

## Points ouverts

1. **`Retry-After` non lisible par le navigateur.** Le backend annonce cet en-tête sur les 429, mais
   le CORS n'expose que `X-Request-Id` (`Access-Control-Expose-Headers`, vérifié le 23/11/2026). Le
   frontend affiche donc « Trop de tentatives. Patientez un peu avant de réessayer. » sans le délai.
   Correctif côté backend : ajouter `Retry-After` aux en-têtes exposés ; aucun changement frontend nécessaire.
2. **Schéma d'erreur absent de `openapi.json`** (manque connu du backend) : le type `ApiError` est écrit
   à la main. Seules les réponses 2xx sont documentées.
3. **`MeResponse` sans champs obligatoires** dans le contrat : le frontend rejette une réponse sans `id`,
   `role` ou `status` (`INVALID_RESPONSE`). Le backend envoie aussi des `null` explicites, non déclarés
   (`nullable`) dans le contrat ; le frontend les traite comme absents. Marquer ces champs `required` côté backend rendrait les types plus précis.
4. **Expiration du jeton (8 h)** : gérée au premier 401 ; pas de déconnexion préventive basée sur `expiresIn`.
5. **Champs obligatoires du contrat** : `email`, `schoolName`, `city`, `country` et `fullName` sont déclarés
   `minLength: 0`. Le frontend refuse les valeurs vides ; le backend devrait les rejeter aussi (`@NotBlank`).
   `schoolType`, `referentRole`, `phone`, `jobTitle`, `sector` et `charterAccepted` sont facultatifs côté
   serveur alors que le frontend les exige (décision 12) : un client direct de l'API peut s'en passer.
6. **Filtres de `GET /api/foundation/accounts`** : `role` est obligatoire, et `role` comme `status`
   n'acceptent qu'une valeur. « Déjà traités » passe donc par des pastilles (un rôle et un statut à la fois) ;
   une vue « tous les comptes traités » demanderait un filtre multiple côté backend.
7. **`INVALID_STATUS_TRANSITION`** à confirmer et à documenter dans le contrat, avec les autres réponses
   d'erreur de la validation et du refus (404 d'un compte inconnu, 400 du motif).
8. **Mise à jour du badge** : seulement après une action dans cet écran ou un rechargement ; pas de
   rafraîchissement périodique des comptes en attente.
9. **Pas de filtre par période ni par décision** sur `GET /api/speaker/slots` et `GET /api/speaker/meetings` :
   toutes les pages sont chargées (`size=100` demandé, 25 pages au plus, avertissement « tous les éléments
   n'ont pas pu être affichés » au-delà). Des paramètres `from` / `to` et `myDecision` côté backend
   éviteraient ce parcours.
10. **Taille de page maximale non documentée** : le frontend demande `size=100` et suit le `totalPages`
    renvoyé ; à confirmer côté backend.
11. **Rafraîchissement** : pas de rechargement périodique ; une décision de la Fondation ou une nouvelle
    demande n'apparaît qu'après une action ou un rechargement de la page.
12. **Codes d'erreur des créneaux et rencontres** (décision 32) à documenter dans le contrat.
13. **`format=ONLINE` et les créneaux BOTH (non vérifié).** Aucun compte école de test n'était disponible
    pour un vrai appel. Vérification : se connecter avec un compte école validé, puis
    `GET /api/school/speakers?format=ONLINE` avec `Authorization: Bearer {jeton}` ; un intervenant dont les
    créneaux sont tous BOTH doit y figurer. S'il manque, la section « Autres zones · disponibles en ligne »
    l'omet à tort : à corriger côté backend (ou appeler aussi sans filtre de format).
14. **Annuaire** : pas de tri, pas de prochains créneaux ni de formats par intervenant, pas de filtre par
    date, un seul secteur par requête ; taille de page maximale non documentée (100 demandé).
15. **Codes d'erreur de la demande** à documenter (`SLOT_NOT_AVAILABLE`, `SLOT_PASSED`,
    `CLASS_SLOT_OVERLAP`, `CLASS_FULL`, `STUDENT_COUNT_TOO_LOW`, statut HTTP et seuil d'effectif) ; le sens
    exact de `CLASS_FULL` est supposé (« la classe ne peut plus recevoir de demande »).
16. **Contrastes en échec, couleurs conservées comme demandé** : avatar de la carte Fondation
    (terracotta sur crème, 4,26:1) et libellé décoratif « SÉNÉGAL » de la carte (1,99:1).
17. **Conformité à la maquette** : F5.1 a corrigé les écarts relevés ; ceux qui restent (backend, contraste,
    comportement) sont dans « Écarts de design restants ».
18. **Décisions par partie d'une rencontre** (intervenant / Fondation) absentes des réponses de l'école :
    un champ du type `speakerDecision` / `foundationDecision` permettrait « Presque confirmée ».
19. **Retours d'expérience de l'école** : deux listes complètes chargées pour connaître l'état de chaque
    rencontre ; un champ `feedbackStatus` dans `SchoolMeetingResponse` éviterait ces requêtes.
20. **Identifiant des élèves** : la connexion élève complète un identifiant sans « @ » avec
    `@eleve.fondationm.sn` (`lib/studentLogin.ts`). Le lot « Mon établissement » devra créer les comptes élèves
    avec cette adresse générée (identifiant lisible = partie avant le « @ », `studentIdentifier`).
    **Backend : un vrai champ identifiant éviterait cette convention.**

## Écarts de design restants

Après F5.1, seuls restent les écarts qui ne peuvent pas être corrigés. Chacun indique le fichier, la valeur
attendue (maquette) et la raison.

| Écran | Fichier | Attendu (maquette) | Raison |
| --- | --- | --- | --- |
| Connexion école / intervenant | `pages/login/SchoolLoginPage.tsx`, `SpeakerLoginPage.tsx` | Aucune maquette (W1-E1 ne dessine que l'inscription) | Colonne W1-E1 / W2-E1, formulaire aux valeurs de W3, textes « Bon retour parmi nous » / « Connectez-vous avec votre adresse e-mail. ». |
| Connexion Fondation / donateur (W3, W4) | `components/layout/LoginSplitLayout.tsx` | Encadré « Ce trimestre · 1 240 jeunes » | Aucune donnée publique d'impact avant connexion. |
| Connexion (W3, W4) | `pages/login/LoginForm.tsx` | « Rester connecté(e) », « Mot de passe oublié ? » | Pas de point d'accès backend (déjà noté). |
| Connexion Fondation (W3) | `components/layout/LoginSplitLayout.tsx` | Crème `#FDE7A6` sur terracotta | Contraste 4,26:1 : `#FFF0C4` (4,60:1), décision 10. |
| Connexion élève (W5) | `pages/login/StudentLoginPage.tsx` | Pastille « Artisanat » blanc sur orange | Contraste 2,82:1 : encre (5,71:1). |
| Connexion élève (W5) | `pages/login/LoginForm.tsx` | « Identifiant » libre | Envoyé comme `{identifiant}@eleve.fondationm.sn` (point ouvert 20). |
| Connexion donateur (W4 mobile) | `components/layout/LoginSplitLayout.tsx` | Pied mobile « Accès réservé à l'équipe. Accès perdu ? … » | Phrase de l'équipe recopiée par erreur dans la maquette : pied de la colonne PC (« Votre accès vous a été envoyé par la Fondation M. ») sous le formulaire, phrase « Accès perdu ? … » dans la carte. |
| Connexion (W3, W4, W5 mobile) | `components/layout/LoginSplitLayout.tsx`, `LoginForm.tsx` | Phrase de pied hors de la carte | Pied du formulaire dans la carte (comme sur PC), note de la colonne sous la carte. |
| Toutes les connexions | `pages/login/PersonaLinks.tsx` | Aucun lien entre les pages de connexion | Ajoutés (« Vous êtes : … », « Vous êtes une école ou un intervenant ? Se connecter »). |
| Inscription (W1-E1, W2-E1) | `components/layout/AuthSplitLayout.tsx` | Logo, titre et sous-titre `#FDE7A6` sur terracotta | Contraste 4,26:1 : `#FFF0C4` conservé (décision 10). |
| Inscription | `pages/register/PlaceFields.tsx`, `lib/places.ts` | « Zone (ville) » : 5 villes du Sénégal, aucune pour les autres pays | 11 villes ajoutées pour le Sénégal (liste validée) ; Zone en champ libre pour un autre pays (la maquette n'en donne aucune). |
| Inscription école | `pages/register/RegisterSchoolPage.tsx` | Champ « Prénom et nom » du référent | Absent du contrat (déjà noté). |
| Inscription | idem | Aide « 8 caractères minimum, dont un chiffre » | Décision validée G4 : « 8 caractères minimum ». |
| Attente (W1-E1-attente, W2-E7) | `pages/PendingAccountPage.tsx` | Lien « Modifier » ; référent « Moussa Ndiaye, … » | Pas de point d'accès de modification ; nom du référent absent. |
| Attente | idem | « nous vous écrirons à … », « À venir · e-mail de bienvenue », « Vous recevrez un e-mail … » | Décision G6 : aucun texte ne promet d'e-mail. |
| Attente | idem | Pas de bouton « Actualiser mon statut » (seulement un bouton de prototype) | Fonction conservée (relit `/api/me`). |
| Comptes (W3-comptes) | `pages/foundation/AccountDetail.tsx` | Fait « Formats » (intervenant), « Référent » (école) | Absents d'`AccountResponse`. |
| Comptes | idem | « Pourquoi il / elle veut transmettre » | Genre inconnu : « Pourquoi il ou elle veut transmettre ». |
| Comptes | idem | Seulement 4 faits | Pays, e-mail, téléphone et charte conservés en plus (utiles à la vérification). |
| Comptes | `pages/foundation/RejectForm.tsx` | Motif « (facultatif, …) » | Motif obligatoire (décision 21). |
| Comptes | `pages/foundation/AccountsPage.tsx` | Surtitre « E11 · E12 » | Code d'écran : « Comptes » (décision validée). |
| Agenda (W2-E8) | `pages/speaker/SlotForm.tsx` | Format par défaut « En classe » ; heures proposées de 8h00 à 17h30 | Format par défaut « En classe ou en ligne » (BOTH, cahier des charges F3) et pas de 15 min de 0h00 à 23h45 (décision 28) : comportement inchangé. |
| Agenda | `pages/speaker/AgendaItemDetail.tsx` | Ligne « Retour d'expérience » et bouton « Partager mon retour » d'une rencontre réalisée ; invite du bandeau | Demanderait `/api/speaker/feedbacks*` (décision 33) ; écran des retours non livré. |
| Agenda | `pages/speaker/MonthGrid.tsx` | Pastille Confirmé / Réalisé « 10h00 · Thiès » seule | Seconde ligne d'état conservée (décision 59, accessibilité). |
| Agenda | `pages/speaker/MonthGrid.tsx` | « + Créneau » seulement sur les jours à venir sans élément (hors aujourd'hui) | Publication possible aujourd'hui et sur un jour occupé (décision 28) : comportement inchangé. |
| Demandes (W2-E9) | `pages/speaker/RequestDetail.tsx` | « Filière · élèves » | Filière absente de `ClassInfo` : « Élèves ». |
| Demandes | idem | Motif « (facultatif, transmis par la Fondation M) » | Motif obligatoire (décision 30). |
| Demandes | `pages/speaker/RequestsPage.tsx` | Onglet « Refusées · n » | « Refusées ou annulées · n » (décision E1 validée). |
| Demandes | `pages/speaker/RequestDetail.tsx` | Pas de fait « Lieu » | Conservé : lieu choisi par l'école, utile à l'intervenant. |
| Annuaire (W1-E3) | `pages/school/SpeakerCard.tsx` | « Prochains créneaux · {format} » (2 créneaux) | L'annuaire ne renvoie que `nextSlotStartAt` (décision 39). |
| Annuaire | `pages/school/NetworkSection.tsx` | Surtitre « Disponibles surtout en ligne » ; pastilles de ville sur mobile | Aucune donnée de format ; sur mobile le choix de ville passe par le filtre « Zone ». |
| Annuaire | `pages/school/SpeakersPage.tsx` | Bouton-filtre « Date » (mobile) | Aucun filtre par date côté backend. |
| Annuaire | `pages/school/NetworkMap.tsx` | Libellé « SÉNÉGAL » `#B8AE98` | Contraste 1,99:1, couleur conservée (décoratif, point ouvert 16). |
| Demande (W1-E4) | `pages/school/MeetingRequestPage.tsx` | Libellé « Intervenante » | Genre inconnu : « Intervenant ». |
| Mes rencontres (W1-E5) | voir « Écarts maquette / backend » | Opacité des rencontres passées, « Presque confirmée », retours « Bientôt », liste « Passées » sur PC, heure dans les listes mobiles | Contraste, données absentes, décisions validées. |
| Toutes | `components/layout/AppLayout.tsx`, `UserMenu.tsx` | Pas de déconnexion ; entrées actives avec pastilles | Déconnexion conservée (lien PC, menu avatar mobile) ; entrées sans écran « Bientôt ». |
| Toutes | `components/layout/roleTheme.ts` | Avatar Fondation `#B8492A` sur `#FDE7A6` | Contraste 4,26:1, couleur conservée (point ouvert 16). |
