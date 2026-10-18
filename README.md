# CongoMedika Backend API

Backend NestJS pour la plateforme de téléconsultation médicale avec authentification 2FA par e-mail.

## Prérequis

- Node.js 18+
- PostgreSQL 14+
- Un compte SMTP pour envoyer les codes de vérification

## Configuration

1. Copier `.env.example` vers `.env` :
```bash
cp .env.example .env
```

2. Configurer la base de données PostgreSQL dans `.env` :
```
DATABASE_URL="postgresql://user:password@localhost:5432/teleconsultation?schema=public"
```

3. Générer trois secrets différents et aléatoires (au moins 32 caractères) :
   - `JWT_ACCESS_SECRET` : pour les tokens d'accès
   - `JWT_REFRESH_SECRET` : pour les tokens de rafraîchissement
   - `AUTH_CODE_SECRET` : pour hacher les codes de vérification

4. Configurer les paramètres SMTP pour l'envoi des codes :
   - `SMTP_HOST` : serveur SMTP
   - `SMTP_PORT` : port (587 pour TLS, 465 pour SSL)
   - `SMTP_SECURE` : `true` pour SSL, `false` pour TLS
   - `SMTP_USER` : identifiant SMTP
   - `SMTP_PASSWORD` : mot de passe SMTP
   - `SMTP_FROM` : adresse d'envoi par défaut

5. Installer les dépendances :
```bash
npm install
```

## Base de données

### Option 1 : Importer le fichier SQL (nouvelle base)

```bash
psql -U postgres -d postgres -f teleconsultation_database.sql
```

### Option 2 : Utiliser les migrations Prisma

```bash
npx prisma generate
npx prisma migrate deploy
```

**Important** : N'utilisez pas les deux options sur la même base, car les tables seraient en double.

## Lancement du projet

```bash
# développement
npm run start:dev

# production
npm run build
npm run start:prod
```

## Routes d'authentification

Toutes les routes ont le préfixe `/api/auth`.

### Inscription
`POST /api/auth/register`

Patient :
```json
{
  "role": "patient",
  "firstName": "Amina",
  "lastName": "Kalala",
  "email": "amina@example.com",
  "phone": "+243000000000",
  "password": "unMotDePasseSolide"
}
```

Médecin :
```json
{
  "role": "doctor",
  "firstName": "Jean",
  "lastName": "Mbala",
  "email": "jean@example.com",
  "phone": "+243000000001",
  "password": "unMotDePasseSolide",
  "specialtyId": 1,
  "licenseNumber": "LIC-001",
  "bio": "Médecin généraliste avec 10 ans d'expérience"
}
```

La réponse contient `challengeId`; un code à 6 chiffres est envoyé par e-mail.

### Vérifier l'e-mail
`POST /api/auth/verify-email`
```json
{ "challengeId": "UUID_RETOURNE_A_L_INSCRIPTION", "code": "123456" }
```

### Renvoyer un code de vérification
`POST /api/auth/resend-verification`
```json
{ "role": "patient", "email": "amina@example.com" }
```

### Connexion (étape 1)
`POST /api/auth/login`
```json
{ "role": "patient", "email": "amina@example.com", "password": "unMotDePasseSolide" }
```
La réponse contient un nouveau `challengeId`; aucun JWT n'est délivré à cette étape.

### Vérifier le code de connexion (étape 2)
`POST /api/auth/verify-login-code`
```json
{ "challengeId": "UUID_RETOURNE_PAR_LOGIN", "code": "123456" }
```
Les jetons JWT sont renvoyés après validation du code.

## Règles de sécurité

- Code à 6 chiffres, expiration après 5 minutes, une seule utilisation
- Maximum de 5 tentatives incorrectes par challenge
- Au moins 60 secondes entre deux demandes de code pour le même e-mail
- Le code n'est pas stocké en clair : seule une empreinte HMAC est conservée
- Les mots de passe sont hachés avec Argon2
- Un médecin conserve le statut `pending` après vérification de son e-mail; l'administration doit l'activer séparément
- Les statuts patient/médecin doivent être `active` pour se connecter

## Tests

```bash
# tests unitaires
npm run test

# tests e2e
npm run test:e2e

# couverture
npm run test:cov
```

## À compléter avant la production

- Mettre en place une procédure d'activation administrative pour les médecins et patients
- Ajouter stockage, rotation et révocation des refresh tokens côté serveur
- Ajouter des tests d'intégration, surveillance et nettoyage périodique des anciens codes
- Configurer HTTPS et CORS appropriés pour l'environnement de production
