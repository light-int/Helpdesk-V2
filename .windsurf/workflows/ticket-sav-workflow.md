---
description: Workflow complet du cycle de vie d'un ticket SAV
---

# Workflow Ticket SAV - Helpdesk V2

## 1. CRÉATION DU DOSSIER

### Déclencheurs
- Client présente un produit défectueux (physique)
- Appel téléphonique au SAV
- WhatsApp / Messenger / Email
- Création interne (problème détecté en magasin)

### Étapes du formulaire (Wizard 3 steps)
**Étape 1: Identification**
- Nom client + Téléphone
- Détection automatique du client (historique)
- Création automatique fiche client si nouveau

**Étape 2: Produit & Garantie**
- Référence produit / Marque / N° Série
- **Auto-détection garantie**: Vérification automatique base de données warranties
- Calcul temps restant garantie
- Indicateur visuel: 🟢 Garantie valide / 🔴 Garantie expirée

**Étape 3: Problème & Priorité**
- Catégorie panne (SAV, Installation, etc.)
- Description détaillée
- Localisation (pour interventions sur site)
- Impact client (Faible / Modéré / Critique)
- Équipement à l'arrêt ? (affecte SLA)

### Auto-Assignation Intelligente
Algorithme de scoring (100 pts max):
1. **Charge de travail (40%)**: Moins de tickets = plus de points
2. **Matching compétences (30%)**: Spécialités technicien vs catégorie
3. **Proximité showroom (20%)**: Même site = bonus
4. **Historique client (10%)**: Déjà travaillé avec ce client = bonus

Notification push envoyée au technicien assigné.

---

## 2. PHASE DE RÉPARATION

### Statuts du workflow
```
Nouveau → En réparation → En attente de devis → Terminé → Payé/Clôturé
   ↓           ↓                ↓                    ↓          ↓
Diagnostic   Intervention    Cotation/Validation   Finalisation Verrouillage
```

### Actions technicien
1. **Diagnostic** (30 min SLA)
   - Évaluation technique
   - Détermination pièces nécessaires

2. **Intervention** (via modal dédié)
   - Pièces utilisées (déduction auto stock)
   - Prestations réalisées
   - Temps passé
   - Rapport technique

3. **Cotation** (si hors garantie)
   - Calcul auto: Pièces + Main d'œuvre + Déplacement
   - Génération devis PDF
   - Validation client requise

### Gestion de stock
- Déduction automatique lors de la clôture
- Traçabilité: Mouvements stock liés au ticket
- Alerte si stock insuffisant

---

## 3. GESTION EXCEPTIONS

### Tickets en attente
- **Attente pièce**: Commande fournisseur
- **Attente client**: Validation devis / Réponse
- **Attente diagnostic externe**: Cas complexes

### Réassignation
- Drag & drop vers autre technicien (Kanban)
- Auto-notification nouveau technicien
- Historique de réassignation conservé

### Fusion de tickets
- Scénario: Même client, même problème, 2 tickets
- Action: Fusionner les 2 dossiers
- Conservation historiques + pièces des 2 tickets

### Réouverture (après clôture)
- Nécessite motif obligatoire
- Déverrouillage temporaire
- Audit trail: "Réouvert pour [raison]"

---

## 4. COMMUNICATION CLIENT

### Canaux intégrés
- **Timeline automatique**: Statuts changent → Logs créés
- **Communications manuelles**: Appels, emails, SMS
- **Attachements**: Photos, factures, devis

### Portail client (vue publique)
- Suivi temps réel du dossier
- Historique interventions
- Téléchargement factures

---

## 5. CLÔTURE & FINANCES

### Conditions de clôture
- ✅ Rapport intervention complété
- ✅ Cotation validée (si hors garantie)
- ✅ Paiement reçu (si solde > 0)

### Actions automatiques clôture
1. Déduction stock pièces utilisées
2. Création mouvements stock OUT
3. Calcul marge finale
4. Verrouillage lecture seule
5. Archivage dossier

### Garantie post-réparation
- 3 mois sur réparation automatique
- Extension possible selon pièces changées

---

## 6. VUES & OUTILS

### Vue Liste
- Tableau filtrable/sortable
- Indicateurs SLA (Normal/Attente/Critique)
- Quick actions

### Vue Kanban
- Drag & drop colonnes
- Réassignation visuelle
- Tags colorés

### Filtres avancés
- Par statut, catégorie, priorité
- Par technicien
- Par niveau SLA
- Par tags

---

## 7. ALERTES & NOTIFICATIONS

### Alertes temps réel
- Nouveau ticket assigné → Push technicien
- Dépassement SLA → Alert management
- Stock critique intervention → Alert logistique

### Tableau de bord Manager
- Vue "État des troupes" (disponibilité techs)
- Alerte surcharge (>maxWorkload)
- Forecasting charge (prévision 3 jours)

---

## RÈGLES MÉTIER CLÉS

| Règle | Description |
|-------|-------------|
| Verrouillage clôture | Ticket 'Fermé' = Lecture seule, modifications bloquées |
| Acomptes | Versement caisse lié au ticket, traçable |
| Garantie | Auto-détection via N° série ou facture |
| SLA | Calculé depuis création, priorité modifie deadline |
| Compétences | Matching auto technicien selon spécialités |

---

## ERREURS COURANTES À ÉVITER

1. **Oublier le rapport** avant clôture → Bloqué par système
2. **Mauvais statut garantie** → Vérifier N° série avant diagnostic
3. **Stock négatif** → Vérifier dispo pièces avant intervention
4. **Non-attribution tech** → L'auto-assign marche si champs vides

---

*Workflow actualisé: Avril 2026*
