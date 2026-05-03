# AI Fix Report — rentalbooking

## Objectif traité

Correction des problèmes signalés : appartements qui ne s'affichent pas, collection vide/statique, création de compte qui ne crée pas de client visible, magic link / email non fiable ou faussement envoyé, et plusieurs erreurs de configuration frontend/backend.

## Corrections principales

### 1. Affichage des appartements

- `frontend/lib/config.ts`
  - Le fallback API n'est plus `https://api.bestflats.vip` en local, mais `http://localhost:4000`.
  - Ajout d'un nettoyage des chemins d'uploads pour convertir `/uploads/appartement/image.avif` en `/uploads/image.avif`, format réellement servi par le backend.
  - Ajout d'un fallback image `/placeholder.svg`.

- `frontend/lib/apartments.ts`
  - Nouveau helper centralisé `fetchApartments()` avec timeout et fallback.
  - Nouveau helper `fetchApartmentById()` avec fallback si le backend est down, vide ou non seedé.

- `frontend/pages/index.tsx`
  - La page d'accueil n'affiche plus une liste vide si l'API échoue.
  - Utilisation des appartements fallback déjà présents dans le projet.
  - Protection contre un `localStorage.guest` corrompu.

- `frontend/pages/collections.tsx`
  - Remplacement des cartes statiques “Preview” par une vraie grille d'appartements.
  - Utilise l'API quand elle fonctionne, puis fallback sinon.

- `frontend/pages/apartment.tsx`
  - Fallback propre si l'appartement n'est pas trouvé côté backend.
  - Support de la page même si l'id n'est pas encore prêt côté router Next.js.

- `frontend/lib/fallbackApartments.ts` et `backend/src/routes/seed.js`
  - Correction des chemins d'images seed/fallback : `/uploads/salon.avif`, `/uploads/chambre.avif`, `/uploads/cuisine.avif`, `/uploads/douche.avif`.

### 2. Création client / Create Account

- `backend/src/auth/users.js`
  - Nouveau service partagé `findOrCreateUser()` pour éviter la duplication et fiabiliser la création client.
  - Chiffrement conservé pour `fullName` et `email`.
  - Recherche par blind index conservée.
  - Si un client existe sous “New Member”, son nom est mis à jour au prochain Create Account.

- `backend/src/routes/customers.js`
  - Nouvelle route `POST /customers` pour créer un client invité.
  - Cette route corrige aussi un flux/test déjà présent dans le projet qui appelait `/customers` alors que la route n'existait pas.

- `backend/src/index.js`
  - Montage de la route `/customers`.

- `backend/src/routes/auth.js`
  - `Create Account` crée maintenant le client dès la demande de magic link si `fullName` est fourni et que le rôle est `guest`.
  - La vérification du magic link crée aussi le client si nécessaire, via le même service partagé.

### 3. Email / Magic link

- `backend/src/auth/mailer.js`
  - Support de `SMTP_URL` ou des variables classiques `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`.
  - En production, le backend ne fait plus semblant d'envoyer un email via Ethereal si SMTP n'est pas configuré.
  - Si SMTP est absent en production, l'erreur est claire : config SMTP manquante.
  - Correction du rate-limit : il est vérifié avant de créer le MagicToken.
  - Si l'envoi mail échoue, le token créé est supprimé pour éviter des tokens inutilisables.

- `podman-compose.yml`
  - Le SMTP n'est plus écrasé en dur par `smtp://mailpit:1025`.
  - Il utilise maintenant `${SMTP_URL:-smtp://mailpit:1025}` et `${MAIL_FROM:-no-reply@bestflats.vip}`.

- `.env.example` et `backend/.env.example`
  - Ajout d'exemples SMTP production et développement.

### 4. URLs API frontend

- Plusieurs pages utilisaient directement `process.env.NEXT_PUBLIC_BACKEND_URL` sans fallback, ce qui pouvait produire des appels vers `undefined/...`.
- Pages corrigées pour utiliser `API_BASE_URL` :
  - `frontend/pages/admin.tsx`
  - `frontend/pages/admin/dashboard.tsx`
  - `frontend/pages/calendar.tsx`
  - `frontend/pages/concierge/dashboard.tsx`
  - `frontend/pages/host/dashboard.tsx`
  - `frontend/pages/magic-callback.tsx`
  - `frontend/pages/magic-request.tsx`
  - `frontend/pages/payments/[bookingId].tsx`

### 5. Autres bugs sûrs corrigés

- `frontend/components/Header.tsx`
  - Suppression d'un import cassé vers `../styles/tree4fivelogo.png`.
  - Utilisation du logo public `/tree4fivelogo.png`.

- `frontend/components/Layout.tsx`
  - Protection contre un `guest` invalide dans `localStorage`.
  - Bouton `Book Now` rendu cliquable vers `/collections`.
  - Lien Instagram configuré via `NEXT_PUBLIC_INSTAGRAM_URL`.

- `backend/src/routes/host.js`
  - Les réservations récentes du dashboard host sont maintenant désérialisées proprement au lieu de risquer d'afficher des champs chiffrés.

- `frontend/e2e/agent.spec.ts` et `frontend/e2e/api-security.spec.ts`
  - Le fallback de test pointe vers `http://localhost:4000` au lieu de taper la production par défaut.

## Fichiers ajoutés

- `backend/src/auth/users.js`
- `backend/src/routes/customers.js`
- `frontend/lib/apartments.ts`
- `frontend/public/placeholder.svg`
- `AI_FIX_REPORT.md`

## Vérifications effectuées

- Vérification syntaxique Node.js de tous les fichiers backend `backend/src/**/*.js` : OK.
- Recherche statique des anciens chemins cassés : OK pour les chemins d'uploads et logo cassé.
- Recherche statique des usages directs de `NEXT_PUBLIC_BACKEND_URL` dans les pages frontend : centralisé via `API_BASE_URL`.

## Vérifications non exécutées complètement

- `npm ci` / tests Jest / build Next.js n'ont pas pu être exécutés complètement dans cet environnement : l'installation des dépendances a bloqué/timeout sans sortie exploitable.
- Le ZIP ne contient pas `node_modules`. Pour tester en local ou serveur :

```bash
cd rental-platform/backend
npm ci
npm test

cd ../frontend
npm ci
npm run build
```

## Configuration SMTP nécessaire en production

Pour recevoir de vrais mails, il faut configurer un vrai SMTP dans `.env`, par exemple :

```env
SMTP_URL=smtps://USER:PASS@smtp.example.com:465
MAIL_FROM=concierge@bestflats.vip
```

ou :

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=USER
SMTP_PASS=PASS
MAIL_FROM=concierge@bestflats.vip
```

En local avec Mailpit, les mails sont visibles sur `http://localhost:8025`.
