# Fondation M — application web

Interface web de Fondation M : mise en relation des classes d'établissements scolaires avec des
intervenants bénévoles, et vue d'impact pour les donateurs.

Stack : Vite, React, TypeScript strict, Tailwind CSS, React Router, TanStack Query,
React Hook Form + Zod, openapi-fetch (types générés par openapi-typescript), Vitest + Testing Library.

## Prérequis

- Node.js 22 ou plus récent (testé avec Node 24) et npm.
- Un accès à internet pour joindre l'API et pour `npm run api:types` (voir plus bas).

## Installation

```bash
cd fondationm-web
npm install
cp .env.example .env
npm run dev
```

L'application est servie sur <http://localhost:5173>. Le port est imposé (`strictPort`) car le CORS du
backend n'autorise que cette origine en développement.

## Configuration (`.env`)

| Variable       | Rôle                         | Valeur de développement                       |
| -------------- | ---------------------------- | --------------------------------------------- |
| `VITE_API_URL` | Adresse de base de l'API REST | `https://les-tisseurs-de-destin.onrender.com` |

- L'application appelle **directement** l'API à cette adresse : il n'y a pas de proxy Vite.
- `.env` et `.env.local` ne sont pas versionnés ; `.env.example` sert de modèle.
- Sans `VITE_API_URL`, l'application refuse de démarrer avec un message explicite.
- Le serveur de développement est hébergé gratuitement et s'endort : le premier appel peut prendre
  une à trois minutes. Au-delà de 5 s, l'interface affiche « Le serveur se réveille… » ; au-delà de
  90 s, la requête est abandonnée et un bouton « Réessayer » est proposé.

## Scripts

| Commande             | Effet                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| `npm run dev`        | Serveur de développement sur le port 5173                              |
| `npm run build`      | Vérification TypeScript (`tsc -b`) puis build de production dans `dist/` |
| `npm run preview`    | Sert le build de production localement                                 |
| `npm run lint`       | oxlint, avertissements traités comme des erreurs                       |
| `npm test`           | Tests Vitest (une passe)                                               |
| `npm run test:watch` | Tests Vitest en mode surveillance                                      |
| `npm run api:types`  | Régénère `src/api/schema.d.ts` depuis `../openapi.json`                |

## Types de l'API

Le contrat de l'API est le fichier `openapi.json` versionné à la racine du dépôt (dossier parent).
`npm run api:types` le lit et génère `src/api/schema.d.ts`, lui aussi versionné.

**Quand le backend change :**

1. Remplacer `../openapi.json` par la nouvelle version du contrat.
2. Lancer `npm run api:types`.
3. Lancer `npm run build` : TypeScript signale chaque appel devenu incompatible.
4. Lancer `npm test`, puis versionner `openapi.json` et `src/api/schema.d.ts` ensemble.

**Pourquoi `npx` plutôt qu'une dépendance :** le projet utilise TypeScript 7, qui n'expose plus l'API
JavaScript du compilateur dont openapi-typescript a besoin (toutes ses versions exigent TypeScript 5).
Installé avec `--legacy-peer-deps`, il plante (`createKeywordTypeNode` indéfini). Le script exécute donc
`openapi-typescript@7.13.0` avec `typescript@5.9.3` dans un environnement `npx` isolé : versions
épinglées, rien d'ajouté à `package.json`. Il faut un accès à npm lors de la génération.

## Structure

```
src/
  api/                client openapi-fetch, intercepteurs, délais, erreurs, types générés
    client.ts         client typé, jeton Bearer, 401 / 403 → événements de session, unwrap()
    transport.ts      fetch avec avis de réveil (5 s) et délai maximal (90 s)
    wakeup.ts         état « le serveur se réveille »
    errors.ts         ApiError, normalisation des erreurs, messages en français
    events.ts         événements de session émis par le client
    schema.d.ts       généré par npm run api:types — ne pas modifier à la main
  auth/               session : tokenStorage, utilisateur courant, rôles, hooks, gestion des événements
  components/ui/      composants de base (Button, FormField, Input, Modal…)
  components/layout/  mises en page (barre latérale ≥ 1024 px, navigation basse sur mobile)
  pages/              connexion, accueils provisoires, compte en attente / refusé, mot de passe, 404
    register/         choix du type de compte, inscription établissement et intervenant (schémas Zod)
    status/           frise et récapitulatif de la page d'attente
  routes/             définition des routes et gardes
  lib/                utilitaires (cn, QueryClient, données de référence, dates, erreurs de formulaire)
  styles/theme.css    jetons de design (couleurs, rayons, ombres, espacements, polices)
  test/               configuration et utilitaires de test (API simulée, aucun appel réseau)
```

## Routes

| Route | Accès | Page |
| --- | --- | --- |
| `/connexion` | public (connecté → accueil) | Connexion |
| `/inscription` | public (connecté → accueil) | Choix du type de compte |
| `/inscription/ecole` | public (connecté → accueil) | Inscription d'un établissement |
| `/inscription/intervenant` | public (connecté → accueil) | Inscription d'un intervenant |
| `/compte-en-attente` | connecté, statut PENDING | Demande en cours de vérification |
| `/compte-refuse` | connecté, statut REJECTED | Demande refusée et motif |
| `/mot-de-passe-obligatoire` | connecté, `mustChangePassword` | Changement de mot de passe obligatoire |
| `/ecole`, `/intervenant`, `/fondation`, `/donateur`, `/eleve` | connecté, validé, rôle correspondant | Accueils provisoires |

## Règles de session

- Le jeton JWT est conservé dans `sessionStorage`, uniquement via `auth/tokenStorage.ts`.
- Le rôle, le statut et `mustChangePassword` viennent toujours de `GET /api/me`, jamais du jeton.
- Un 401 hors `POST /api/auth/login` déconnecte et affiche « Session expirée ».
- `PASSWORD_CHANGE_REQUIRED` et `ACCOUNT_NOT_VALIDATED` (403) relisent `/api/me` puis redirigent vers la
  page correspondante.
