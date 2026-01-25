
# Guide de déploiement Hostinger - Royal Plaza Horizon

## Étape 1 : Préparation du Build (Sur votre machine)

1. Ouvrez un terminal dans le dossier du projet.
2. Définissez votre clé API Gemini pour le build :
   - **Windows (PowerShell)** : `$env:API_KEY="VOTRE_CLE_ICI"; npm run build`
   - **Mac/Linux** : `API_KEY=VOTRE_CLE_ICI npm run build`
3. Un dossier nommé `dist` sera créé à la racine.

## Étape 2 : Connexion à Hostinger

1. Connectez-vous à votre **hPanel Hostinger**.
2. Allez dans **Hébergement** -> **Gérer** -> **Gestionnaire de fichiers**.
3. Accédez au dossier `public_html`.

## Étape 3 : Mise en ligne

1. Compressez le contenu du dossier `dist` (et non le dossier lui-même) en un fichier `.zip`.
2. Téléchargez ce `.zip` dans `public_html` sur Hostinger.
3. Extrayez le fichier. Assurez-vous que `index.html` et `.htaccess` se trouvent directement dans `public_html`.

## Étape 4 : Vérification

Votre application est désormais en ligne ! 
- L'IA Gemini fonctionnera car la clé a été "scellée" dans le code lors de l'étape 1.
- Le rafraîchissement des pages (ex: /tickets) fonctionnera grâce au fichier `.htaccess`.
- La base de données Supabase se connectera automatiquement via le cloud.
