# État du frontend — Fondation M

Dernière mise à jour : 24 novembre 2026 — lot F2 (espace Fondation : navigation et validation des comptes).

## Avancement

| Lot | Contenu                                                                     | État     |
| --- | --------------------------------------------------------------------------- | -------- |
| F0  | Configuration, jetons de design, composants de base, client d'API, session, gardes, erreurs, connexion, accueils provisoires | Terminé |
| F0.1 | Design de la maquette « Marché » appliqué (thème, composants, connexion, mise en page) | Terminé |
| F1  | Inscription établissement et intervenant, pages « en attente » et « refusé », changement de mot de passe obligatoire | Terminé |
| F2  | Espace Fondation : navigation, « Comptes à valider » (liste, détail, validation, refus motivé) | Terminé |
| F3+ | Autres écrans métier (tableau de bord Fondation, rencontres, retours, donateurs…) | À faire  |

Vérifications au moment de la livraison de F2 : `npm run build`, `npm run lint` et `npm test`
(91 tests) passent sans erreur ni avertissement.

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

## Écarts

- `--legacy-peer-deps` remplacé par l'exécution `npx` isolée (voir décision 3).
- La navigation par rôle ne contient que « Accueil » : les entrées viendront avec les écrans métier.

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
