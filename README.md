# Serein — passer de prototype à vraie application

Ce dossier est un vrai projet web (plus un artefact Claude). Chaque personne qui
l'utilise a son propre compte et ses propres données, sauvegardées en ligne —
accessible depuis un ordinateur ou un téléphone, dans le navigateur.

Tout ce qui suit est **gratuit** pour démarrer (comptes gratuits, aucune carte
bancaire nécessaire à ce stade).

## Ce que contient cette version

Tout ce qu'on a construit ensemble jusqu'ici : les 5 profils (étudiant, couple,
parent, aidant proche, autre) avec attribution par personne, calendrier avec
patrimoine net et prochains jours, dettes avec calcul d'intérêt réel, projets,
abonnements/factures/revenus/investissements avec historique et tendances,
célébrations, export (CSV/JSON/impression), thème personnalisable à 3 couleurs,
bilingue français/anglais, et maintenant — **une vraie authentification par
e-mail** (plus de maquette) et **des données sauvegardées en ligne**, propres à
chaque personne.

## Ce dont tu as besoin (3 comptes gratuits)

1. **GitHub** (github.com) — pour héberger le code
2. **Supabase** (supabase.com) — la base de données + les comptes utilisateurs
3. **Vercel** (vercel.com) — pour que le site soit en ligne, avec une vraie adresse

## Étape 1 — Créer le projet Supabase

1. Va sur supabase.com, crée un compte, puis **New project**
2. Une fois le projet créé, va dans **SQL Editor** (menu de gauche)
3. Ouvre le fichier `supabase-schema.sql` de ce dossier, colle tout son contenu
   dans l'éditeur SQL, et clique **Run**. Ça crée la table qui stockera les
   données de chaque utilisateur, avec la sécurité (chacun ne voit que les
   siennes).
4. Va dans **Project Settings > API**. Note deux valeurs :
   - **Project URL**
   - **anon public key**

## Étape 2 — Configurer le code

1. Dans ce dossier, duplique `.env.example` en un fichier nommé `.env`
2. Colle les deux valeurs de l'étape 1 dedans :
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=ta-clé-anon
   ```

## Étape 3 — Tester en local (optionnel mais recommandé)

Si tu as Node.js installé sur ton ordinateur :
```
npm install
npm run dev
```
Ouvre l'adresse affichée (généralement http://localhost:5173) — tu dois voir
l'écran de connexion Serein par e-mail, puis l'inscription.

## Étape 4 — Mettre en ligne avec Vercel

1. Crée un dépôt sur GitHub, mets-y tout le contenu de ce dossier (`git init`,
   `git add .`, `git commit`, puis pousse-le sur GitHub — ou utilise l'interface
   web de GitHub si tu préfères ne pas utiliser le terminal)
2. Va sur vercel.com, connecte ton compte GitHub, choisis **Import** sur ce
   dépôt
3. Dans les réglages du projet Vercel, section **Environment Variables**,
   ajoute les deux mêmes valeurs que dans ton `.env` :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique **Deploy**

Vercel te donne une adresse (ex: `serein.vercel.app`). C'est ton
application, en ligne, utilisable par n'importe qui avec un e-mail.

## Étape 5 — Autoriser l'adresse dans Supabase

Par défaut, Supabase n'autorise que `localhost` pour les liens de connexion.
Une fois ton site en ligne :
1. Dans Supabase : **Authentication > URL Configuration**
2. Ajoute l'adresse Vercel (ex: `https://serein.vercel.app`) dans
   **Site URL** et dans **Redirect URLs**

## Utilisation sur téléphone

Une fois en ligne, ouvre l'adresse Vercel dans Safari (iPhone) ou Chrome
(Android), puis :
- iPhone : bouton Partager → **Sur l'écran d'accueil**
- Android : menu ⋮ → **Ajouter à l'écran d'accueil**

L'appli s'ouvre alors comme une vraie application, en plein écran.

## Ce qui n'est PAS encore inclus

- Verrouillage Face ID / code à l'ouverture
- Rappels avant échéance (notifications push) — demande une configuration
  supplémentaire (web push ou app native), pas incluse dans cette synchronisation
- Synchronisation bancaire automatique — étape future, coûteuse et plus
  complexe (voir discussion précédente)
- Paiement/abonnement (à ajouter avec Stripe le jour où tu veux monétiser)
- Nom de domaine personnalisé (Vercel permet d'en ajouter un plus tard,
  ex: serein.app, si tu en achètes un — quelques dizaines d'euros/an)
- La politique de confidentialité complète (rédigée séparément) n'est pas
  encore hébergée en ligne — pense à la publier et à y ajouter un vrai lien
  quelque part accessible (Réglages, pied de page) avant d'ouvrir l'accès
  à de vraies personnes

## En cas de blocage

Chaque étape ci-dessus a une documentation officielle si un point n'est pas
clair : supabase.com/docs, vercel.com/docs. Reviens vers Claude à tout moment
avec une capture d'écran de ce qui bloque.
