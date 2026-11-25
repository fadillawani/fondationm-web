# État du frontend — Fondation M

Dernière mise à jour : 24 novembre 2026 — lot F4 (espace établissement : intervenants et demande de rencontre).

## Avancement

| Lot | Contenu                                                                     | État     |
| --- | --------------------------------------------------------------------------- | -------- |
| F0  | Configuration, jetons de design, composants de base, client d'API, session, gardes, erreurs, connexion, accueils provisoires | Terminé |
| F0.1 | Design de la maquette « Marché » appliqué (thème, composants, connexion, mise en page) | Terminé |
| F1  | Inscription établissement et intervenant, pages « en attente » et « refusé », changement de mot de passe obligatoire | Terminé |
| F2  | Espace Fondation : navigation, « Comptes à valider » (liste, détail, validation, refus motivé) | Terminé |
| F3  | Espace intervenant : navigation, « Mon agenda » (calendrier, créneaux), « Demandes reçues » (accepter, refuser) | Terminé |
| F4  | Espace établissement : « Intervenants disponibles » (annuaire, carte du réseau), « Demander une rencontre » ; thèmes de barre latérale par persona | Terminé |
| F5+ | Autres écrans métier (mes rencontres, mon établissement, tableau de bord Fondation, retours, donateurs…) | À faire  |

Vérifications au moment de la livraison de F4 : `npm run build`, `npm run lint` et `npm test`
(139 tests) passent sans erreur ni avertissement.

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

## Écarts

- `--legacy-peer-deps` remplacé par l'exécution `npx` isolée (voir décision 3).
- La navigation des rôles donateur et élève ne contient que « Accueil » : les entrées viendront avec
  leurs écrans.

## Écarts maquette / backend

| Élément de la maquette | Situation dans le contrat | Choix frontend |
| --- | --- | --- |
| « Prénom et nom » du référent d'établissement | Absent de `RegisterSchoolRequest` et de `SchoolProfileResponse` | Champ non affiché ; « Merci {nom de l'établissement} » sur la page d'attente. **À ajouter côté backend plus tard.** |
| Lien « Lire la charte » | Aucun texte de charte n'existe | Lien inactif (`aria-disabled`) |
| Lien « Modifier » de la page d'attente | Aucun point d'accès de modification pour un compte en attente | Non affiché |
| Case « Rester connecté », lien « Mot de passe oublié » (connexion) | Pas de point d'accès | Non affichés |
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
17. **Comparaison maquette des bandeaux d'en-tête et pastilles (intervenant, Fondation)** : la maquette
    visuelle n'est pas dans le dépôt ; seuls les éléments décrits dans les cahiers des charges ont pu être
    vérifiés. Écarts connus : l'en-tête mobile est le même pour toutes les personas (barre blanche, logo
    terracotta, rôle) ; les couleurs des états de l'agenda (F3) et des onglets en pastilles (F2, F3 : fond
    encre, texte blanc) viennent des cahiers des charges, sans maquette de référence pour les autres détails.
