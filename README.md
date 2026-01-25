# Royal Plaza - Horizon (Déploiement Local)

Système de gestion SAV et Helpdesk motorisé par l'IA Gemini.

## 🚀 Installation Rapide

1. **Extraire les fichiers** dans un dossier nommé `royal-plaza-horizon`.
2. **Ouvrir un terminal** dans ce dossier.
3. **Installer les dépendances** :
   ```bash
   npm install
   ```

## 🔑 Configuration de l'IA (Gemini)

L'application nécessite une clé API Google AI Studio pour fonctionner (chat, résumés, audits).

1. Créez un fichier `.env` à la racine du projet.
2. Ajoutez votre clé comme ceci :
   ```env
   VITE_GEMINI_API_KEY=votre_cle_ici
   ```
   *(Note : Dans cet environnement spécifique, l'application utilise `process.env.API_KEY`. Pour un usage local avec Vite, assurez-vous de configurer le plugin `define` dans `vite.config.ts` ou d'utiliser les variables d'environnement système).*

## 🛠 Lancement

### Mode Développement
```bash
npm run dev
```
L'application sera accessible sur `http://localhost:5173`.

### Mode Production (Build)
```bash
npm run build
npm run preview
```

## 🗄️ Base de données
L'application est déjà configurée pour pointer vers l'instance Cloud Supabase de Royal Plaza. Aucune configuration de base de données locale n'est requise pour le fonctionnement standard.

---
**Identifiants par défaut (si base vide) :**
- **User** : `admin`
- **Pass** : `intxxl`
