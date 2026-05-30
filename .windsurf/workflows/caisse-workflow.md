---
description: Workflow complet du cycle de vie d'une session de caisse
---

# Workflow Caisse - Helpdesk V2

## 1. OUVERTURE DE SESSION

### Conditions préalables
- Seul un utilisateur avec rôle adéquat peut ouvrir (MANAGER bloqué)
- Une seule session active possible à la fois
- Vérification automatique : pas de session "Ouverte" existante

### Processus d'ouverture
```
Utilisateur clique "Ouvrir la Caisse"
         ↓
Modal Ouverture s'affiche
         ↓
Saisie Fond Initial (F CFA) - défaut: 0
         ↓
API: caisse.openSession()
         ↓
Session créée avec:
  - ID: UUID généré
  - Status: "Ouverte"
  - openedAt: timestamp ISO
  - openingBalance: montant saisi
  - openedBy: ID utilisateur
         ↓
Notification: "Caisse ouverte - Fond: X F"
         ↓
Interface active → Encaissements possibles
```

### API utilisée
```typescript
ApiService.caisse.openSession({
  status: 'Ouverte',
  openingBalance: number,
  openedBy: string,
  notes?: string
})
```

---

## 2. ENCAISSEMENTS (Session Active)

### Types de transactions
| Type | Description | Déclencheur |
|------|-------------|-------------|
| **Acompte** | Paiement partiel ticket en cours | Ticket "En réparation" ou "Devis accepté" |
| **Solde** | Paiement final | Ticket "Terminé - Prêt à être payé" |
| **Vente Directe** | Vente sans ticket SAV | Bouton dédié (si implémenté) |

### Flux encaissement
```
Ticket prêt à payer
         ↓
Affichage dans "À Encaisser" (Finances > Caisse)
         ↓
Clique bouton "Encaisser" ou "Acompte"
         ↓
Modal Paiement s'ouvre
         ↓
Saisie:
  - Montant (F CFA)
  - Mode: Espèces / Airtel Money / Moov Money / Virement / Carte
         ↓
Validation
         ↓
Actions atomiques:
  1. MAJ Ticket.financials
     - advancePayment += montant
     - remainingToPay recalculé
     - isPaid = true (si solde complet)
     - paymentDate = now
     - paymentMethod = mode
     - invoiceNumber généré (si solde)
  2. Sauvegarde Ticket (ApiService.tickets.saveAll)
  3. Création entrée caisse (ApiService.caisse.addEntry)
  4. Notification succès
         ↓
Ticket MAJ + Journal de caisse mis à jour
```

### Calculs financiers
```typescript
// Acompte
remainingToPay = grandTotal - (advancePayment + montant) - storeCredit

// Solde
if (montant >= remainingToPay) {
  isPaid = true
  statusTicket = "Payé - Clôturé"
  remainingToPay = 0
}
```

### API utilisées
```typescript
// 1. Mise à jour ticket
ApiService.tickets.saveAll([ticket])

// 2. Ajout entrée caisse
ApiService.caisse.addEntry({
  sessionId: string,
  ticketId: string,
  type: 'Acompte' | 'Solde',
  amount: number,
  method: 'Espèces' | 'Airtel Money' | 'Moov Money' | 'Virement' | 'Carte',
  recordedBy: string
})
```

---

## 3. SUIVI EN TEMPS RÉEL (Session Active)

### Dashboard Caisse
```
┌─────────────────────────────────────────────────────────────┐
│  Session Ouverte - Depuis 08:30                             │
├─────────────────────────────────────────────────────────────┤
│  Fond Initial      Encaissements    Total Théorique   Trans │
│  50,000 F          +125,000 F       175,000 F          12    │
└─────────────────────────────────────────────────────────────┘

Répartition par mode:
├─ Espèces:       85,000 F
├─ Airtel Money:  25,000 F
├─ Moov Money:    10,000 F
├─ Virement:       5,000 F
└─ Carte:              0 F
```

### Calculs temps réel
```typescript
const sessionStats = {
  totalPayments: sum(sessionEntries.amount),
  byMethod: groupBy(sessionEntries, 'method').sum('amount'),
  theoretical: activeSession.openingBalance + totalPayments
}
```

---

## 4. CLÔTURE DE SESSION (Rapport Z)

### Conditions de clôture
- Session active existante
- Utilisateur != MANAGER (restrictions rôle)
- Comptage physique de la caisse

### Processus de clôture
```
Clique "Clôturer" (header session card)
         ↓
Modal Clôture s'affiche
         ↓
Rappel calculs:
  - Fond Initial: X F
  - Total Théorique: Y F (fond + encaissements)
         ↓
Saisie Comptage Réel:
  - closingRealBalance: montant compté physiquement
         ↓
Calcul Écart:
  écart = closingRealBalance - theoretical
         ↓
API: caisse.closeSession()
         ↓
Session mise à jour:
  - status: "Fermée"
  - closedAt: timestamp ISO
  - closingBalance: montant réel
  - totalReal: closingBalance - openingBalance
  - totalTheoretical: sessionStats.totalPayments
  - notes: "Écart de caisse: Z F"
         ↓
Session terminée → Retour écran "Caisse Fermée"
```

### Gestion des écarts
| Écart | Interprétation | Action |
|-------|----------------|--------|
| 0 | Caisse équilibrée | Clôture normale |
| > 0 | Surplus | Noté dans notes |
| < 0 | Manquant | Noté dans notes |

### API utilisée
```typescript
ApiService.caisse.closeSession(sessionId, {
  closingBalance: number,      // Comptage réel
  totalReal: number,           // closing - opening
  totalTheoretical: number,    // Sum des entries
  closedBy: string,
  notes?: string               // Écart constaté
})
```

---

## 5. ARCHIVES ET HISTORIQUE

### Consultation sessions passées
- Onglet "Archives" dans Finances
- Liste toutes les sessions (ouvertes et fermées)
- Tri par date ouverture (descendant)

### Détails par session
```
Session #UUID
├─ Date ouverture: 2026-04-26 08:30
├─ Date clôture: 2026-04-26 18:45
├─ Fond initial: 50,000 F
├─ Total encaissé: 245,000 F
├─ Solde final théorique: 295,000 F
├─ Solde final réel: 295,000 F
├─ Écart: 0 F ✅
├─ Ouverte par: Jean Dupont
├─ Fermée par: Marie Martin
└─ Journal des transactions:
   ├─ 08:45 - Acompte - Ticket T-12345 - 25,000 F (Espèces)
   ├─ 10:30 - Solde - Ticket T-12346 - 75,000 F (Airtel Money)
   └─ ...
```

### API consultation
```typescript
// Toutes les sessions
ApiService.caisse.getAllSessions()

// Entrées d'une session
ApiService.caisse.getEntriesBySession(sessionId)

// Entrées globales (toutes sessions)
ApiService.caisse.getAllEntries()
```

---

## 6. INTÉGRATION AVEC TICKETS SAV

### Liens automatiques
- Chaque encaissement crée une entrée caisse liée au `ticketId`
- Le ticket stocke son historique financier complet
- Traçabilité: Qui, Quand, Combien, Comment

### Workflow intégré Ticket ↔ Caisse
```
Ticket SAV créé
    ↓
Intervention effectuée
    ↓
Devis validé → Acompte encaissé
    ↓
Réparation terminée
    ↓
Solde encaissé → Ticket "Payé - Clôturé"
    ↓
Facture générée automatiquement
```

---

## 7. SÉCURITÉ ET CONTRÔLES

### Restrictions par rôle
| Rôle | Ouvrir | Encaisser | Clôturer | Voir Archives |
|------|--------|-----------|----------|---------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| AGENT | ✅ | ✅ | ✅ | ✅ |
| TECHNICIEN | ❌ | ❌ | ❌ | Lecture seule |
| MANAGER | ❌ | ❌ | ❌ | ✅ (lecture) |

### Vérifications système
- Impossible d'encaisser sans session active
- Double-vérification montants (ticket vs caisse)
- Génération automatique numéros facture
- Journal immuable (pas de suppression/modification entrées)

---

## RÈGLES MÉTIER CLÉS

| Règle | Description |
|-------|-------------|
| Session unique | Une seule caisse ouverte à la fois |
| Fond initial | Montant de départ saisi à l'ouverture |
| Théorique = Réel | Objectif: écart nul à la clôture |
| Traçabilité | Chaque franc est lié à un ticket ou une vente |
| Facturation | Numéro auto-généré uniquement au paiement final |
| Archivage | Sessions fermées consultables en lecture seule |

---

## ERREURS COURANTES À ÉVITER

1. **Oublier d'ouvrir la caisse** → Encaissements bloqués
2. **Mauvais comptage clôture** → Écart inexplicable
3. **Paiement sans ticket** → Utiliser vente directe (si dispo)
4. **Mode paiement erroné** → Statistiques faussées
5. **Clôture MANAGER** → Bloqué par sécurité

---

## STRUCTURE DE DONNÉES

### CashRegisterSession
```typescript
{
  id: string;
  status: 'Ouverte' | 'Fermée';
  openedAt: string;          // ISO timestamp
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  totalReal?: number;        // Recettes réelles
  totalTheoretical?: number; // Recettes attendues
  openedBy: string;          // User ID
  closedBy?: string;
  notes?: string;
}
```

### CashRegisterEntry
```typescript
{
  id: string;
  sessionId: string;
  ticketId?: string;          // null si vente directe
  type: 'Acompte' | 'Solde' | 'Vente Directe';
  amount: number;
  method: 'Espèces' | 'Airtel Money' | 'Moov Money' | 'Virement' | 'Carte';
  timestamp: string;
  recordedBy: string;
  notes?: string;
}
```

---

*Workflow actualisé: Avril 2026*
