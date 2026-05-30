import { jsPDF } from 'jspdf';
import fs from 'fs';

// Configuration du document
const doc = new jsPDF({
  orientation: 'p',
  unit: 'mm',
  format: 'a4'
});

const pageWidth = doc.internal.pageSize.getWidth(); // 210
const pageHeight = doc.internal.pageSize.getHeight(); // 297
const margin = 20;
const contentWidth = pageWidth - (margin * 2); // 170

let currentPage = 1;
let currentY = margin;

// Couleurs (Thème Royal Plaza - Horizon : Vert émeraude & Gris sombre)
const primaryColor = { r: 62, g: 207, b: 142 }; // #3ecf8e
const darkColor = { r: 28, g: 28, b: 28 }; // #1c1c1c
const grayColor = { r: 104, g: 104, b: 104 }; // #686868
const lightGrayColor = { r: 240, g: 240, b: 240 }; // #f0f0f0

function drawHeaderFooter() {
  // En-tête (sauf page 1)
  if (currentPage > 1) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text("ROYAL PLAZA - HORIZON", margin, 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
    doc.text("MANUEL DES WORKFLOWS APPLICATIFS", margin + 50, 12);
    
    // Ligne sous en-tête
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.2);
    doc.line(margin, 15, pageWidth - margin, 15);
  }

  // Pied de page
  doc.setDrawColor(lightGrayColor.r, lightGrayColor.g, lightGrayColor.b);
  doc.setLineWidth(0.2);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
  doc.text("Document confidentiel - Usage interne", margin, pageHeight - 10);
  doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
}

function checkPageOverflow(neededHeight) {
  if (currentY + neededHeight > pageHeight - 20) {
    doc.addPage();
    currentPage++;
    currentY = margin + 5; // Un peu plus bas pour l'en-tête
    drawHeaderFooter();
  }
}

function writeTitle(text) {
  checkPageOverflow(15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
  doc.text(text, margin, currentY);
  
  // Petite ligne décorative sous le titre
  currentY += 3;
  doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setLineWidth(1);
  doc.line(margin, currentY, margin + 25, currentY);
  
  currentY += 8;
}

function writeSubTitle(text) {
  checkPageOverflow(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text(text, margin, currentY);
  currentY += 6;
}

function writeParagraph(text, isItalic = false) {
  doc.setFont('helvetica', isItalic ? 'italic' : 'normal');
  doc.setFontSize(10);
  doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
  
  const lines = doc.splitTextToSize(text, contentWidth);
  const neededHeight = lines.length * 5;
  
  checkPageOverflow(neededHeight);
  
  lines.forEach(line => {
    doc.text(line, margin, currentY);
    currentY += 5;
  });
  
  currentY += 2; // Espace après paragraphe
}

function writeBulletPoint(title, desc) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
  
  const bulletSymbol = "• ";
  const fullText = bulletSymbol + title + " : " + desc;
  const lines = doc.splitTextToSize(fullText, contentWidth - 5);
  const neededHeight = lines.length * 5;
  
  checkPageOverflow(neededHeight);
  
  // Dessine la puce en gras et le titre
  doc.text(bulletSymbol, margin, currentY);
  doc.text(title + " : ", margin + 4, currentY);
  
  // Calcule la largeur du titre pour décaler la description si sur la première ligne
  const titleWidth = doc.getTextWidth(bulletSymbol + title + " : ");
  
  doc.setFont('helvetica', 'normal');
  const descLines = doc.splitTextToSize(desc, contentWidth - 4);
  
  // Plus simple pour jsPDF : écrire le texte combiné complet, mais formater le titre en gras est plus pro.
  // Pour éviter des décalages complexes, on écrit tout le bloc en adaptant
  lines.forEach((line, index) => {
    if (index === 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(bulletSymbol + title + " :", margin, currentY);
      doc.setFont('helvetica', 'normal');
      const startX = margin + doc.getTextWidth(bulletSymbol + title + " : ");
      const remainingLineText = line.substring((bulletSymbol + title + " :").length);
      doc.text(remainingLineText, startX, currentY);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text(line, margin + 4, currentY);
    }
    currentY += 5;
  });
  currentY += 1.5;
}

// ==================== PAGE 1 : COUVERTURE ====================
// Fond décoratif
doc.setFillColor(darkColor.r, darkColor.g, darkColor.b);
doc.rect(0, 0, pageWidth, 90, 'F');

doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
doc.rect(0, 90, pageWidth, 5, 'F');

// Titre sur la couverture
doc.setFont('helvetica', 'bold');
doc.setFontSize(26);
doc.setTextColor(255, 255, 255);
doc.text("ROYAL PLAZA - HORIZON", margin, 40);

doc.setFont('helvetica', 'normal');
doc.setFontSize(14);
doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
doc.text("SYSTÈME DE GESTION SAV & HELPDESK INTELLIGENT", margin, 55);

// Contenu de la couverture
currentY = 120;
doc.setFont('helvetica', 'bold');
doc.setFontSize(18);
doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
doc.text("Manuel des Workflows Applicatifs", margin, currentY);
currentY += 10;

doc.setFont('helvetica', 'normal');
doc.setFontSize(10);
doc.setTextColor(grayColor.r, grayColor.g, grayColor.b);
const introText = "Ce document présente de manière exhaustive et technique les différents circuits opérationnels de l'application Royal Plaza - Horizon. Conçu pour les administrateurs, les gestionnaires de service après-vente, les techniciens et les opérateurs de caisse, ce manuel détaille les processus de gestion des tickets, les flux de trésorerie, la logistique de stock et l'intégration de l'IA Gemini.";
const introLines = doc.splitTextToSize(introText, contentWidth);
introLines.forEach(line => {
  doc.text(line, margin, currentY);
  currentY += 5;
});

// Bloc d'information en bas
currentY = 220;
doc.setFillColor(lightGrayColor.r, lightGrayColor.g, lightGrayColor.b);
doc.rect(margin, currentY, contentWidth, 40, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(9);
doc.setTextColor(darkColor.r, darkColor.g, darkColor.b);
doc.text("INFORMATIONS DU DOCUMENT", margin + 5, currentY + 8);

doc.setFont('helvetica', 'normal');
doc.text("Version : 2.0 (Consolidée)", margin + 5, currentY + 16);
doc.text("Auteur : Antigravity Coding Assistant", margin + 5, currentY + 22);
doc.text("Date de génération : 29 Mai 2026", margin + 5, currentY + 28);
doc.text("Technologie : React / TypeScript / Supabase Cloud", margin + 5, currentY + 34);

drawHeaderFooter();

// ==================== PAGE 2 : INTRODUCTION ET RÔLES ====================
doc.addPage();
currentPage++;
currentY = margin + 5;
drawHeaderFooter();

writeTitle("1. Introduction et Acteurs du Système");

writeParagraph("L'application Royal Plaza - Horizon unifie la gestion opérationnelle du service après-vente (SAV), le contrôle rigoureux des flux financiers en showrooms et la traçabilité complète des pièces détachées. Grâce à une synchronisation en temps réel avec Supabase Cloud, elle assure une collaboration transparente entre les différents acteurs de l'entreprise.");

writeSubTitle("Rôles et responsabilités dans le système");

writeBulletPoint("Administrateur", "Dispose d'un contrôle total sur la configuration de l'application, les clés d'API (notamment la clé Gemini pour l'IA), les paramètres de messagerie SMTP, et la gestion globale des profils utilisateurs.");

writeBulletPoint("Gestionnaire SAV / Agent de support", "Prend en charge la relation client omnicanale. Crée, qualifie et attribue les tickets aux techniciens, édite les devis de réparation et assure le suivi des communications avec les clients.");

writeBulletPoint("Technicien de maintenance", "Réalise les diagnostics physiques des équipements en panne, définit les pièces nécessaires à la réparation, exécute les travaux et rédige les rapports d'intervention.");

writeBulletPoint("Opérateur de caisse", "Gère la caisse enregistreuse du showroom. Enregistre les acomptes lors de l'acceptation des devis, encaisse les soldes à la livraison des appareils, et déclare les dépenses quotidiennes d'atelier.");

writeBulletPoint("Manager de Showroom", "Supervise les flux financiers locaux, valide les transferts de fonds initiés par les caissiers, et analyse les performances des techniciens.");

// ==================== PAGE 3 : WORKFLOW DES TICKETS SAV ====================
doc.addPage();
currentPage++;
currentY = margin + 5;
drawHeaderFooter();

writeTitle("2. Cycle de vie des Tickets SAV");

writeParagraph("Le workflow des tickets constitue le cœur fonctionnel de l'application. Il formalise le parcours complet d'un équipement confié par un client pour réparation, représenté par la table de données 'tickets'.");

writeSubTitle("Les étapes clés du workflow de réparation");

writeBulletPoint("Nouveau", "Le ticket est créé suite à une demande client. Il contient les informations de base de l'appareil (marque, modèle, n° de série) et la description du dysfonctionnement constaté.");

writeBulletPoint("En attente de devis", "Un technicien qualifié est affecté à l'appareil. Il effectue les tests de diagnostic et liste les fournitures de stock et prestations requises.");

writeBulletPoint("Devis envoyé", "Une estimation (cotation) chiffrée est transmise au client. Le devis intègre les coûts de main-d'œuvre fixe et le prix public des pièces.");

writeBulletPoint("En attente de paiement / Client", "Le devis est présenté au client. S'il l'approuve, un acompte peut être exigé pour valider le lancement des travaux. Le statut passe en attente de paiement.");

writeBulletPoint("En réparation / En cours", "Les pièces détachées sont physiquement prélevées et réservées. Le technicien procède au dépannage. Si une pièce manque, le ticket bascule temporairement en statut 'Commande pièce'.");

writeBulletPoint("Terminé - Prêt à être payé", "La réparation est validée. Le technicien produit son rapport d'intervention (contenant les mesures de diagnostic final, les photos avant/après et les commentaires techniques).");

writeBulletPoint("Payé - Clôturé", "Le client s'acquitte du solde restant. Une facture finale est générée et imprimée. Les informations de garantie sont enregistrées dans la table 'warranties' pour le suivi futur.");

// ==================== PAGE 4 : WORKFLOWS FINANCIERS ET DE STOCK ====================
doc.addPage();
currentPage++;
currentY = margin + 5;
drawHeaderFooter();

writeTitle("3. Caisse (POS) & Gestion Logistique");

writeParagraph("Pour assurer une parfaite étanchéité financière et un approvisionnement constant en pièces détachées, l'application intègre deux workflows hautement surveillés.");

writeSubTitle("Le workflow de Caisse POS");
writeParagraph("La gestion financière locale en showroom s'organise autour de sessions de caisse étanches et journalières :");

writeBulletPoint("Session de caisse", "Ouverte par un opérateur avec un montant de départ validé. La session enregistre de manière immuable toutes les transactions d'acompte, de solde et de dépense courante.");

writeBulletPoint("Transfert de coffre (Fund Transfer)", "Afin de limiter le cash physique en showroom, le caissier initie des demandes de transfert vers le coffre du manager. Ces flux doivent être validés en double signature électronique.");

writeBulletPoint("Clôture et Variance", "À la fin de la journée, l'opérateur ferme sa caisse en déclarant le montant physique. Le système calcule l'écart (variance) avec le solde théorique. Les anomalies sont consignées dans les tables d'audit.");

writeSubTitle("Le workflow Logistique des Pièces");
writeParagraph("Le stock de pièces de rechange ('parts') est tracé à chaque mouvement physique pour éviter toute perte :");

writeBulletPoint("Réservation", "Dès qu'un devis est accepté, les pièces correspondantes sont logiquement réservées pour le ticket dans la table 'stock_reservations', empêchant leur réattribution.");

writeBulletPoint("Entrées/Sorties de Stock", "Toute action physique fait l'objet d'un enregistrement dans 'stock_movements' (mouvements IN pour les réapprovisionnements fournisseurs, OUT pour les consommations sur tickets de réparation).");

writeBulletPoint("Inventaires physiques", "Les techniciens effectuent des comptages physiques périodiques. Les différences constatées sont enregistrées pour ajuster les valeurs comptables réelles.");

// ==================== PAGE 5 : FLOTTE ET IA GEMINI ====================
doc.addPage();
currentPage++;
currentY = margin + 5;
drawHeaderFooter();

writeTitle("4. Logistique de Flotte & Intelligence Gemini");

writeSubTitle("Gestion de flotte de transport");
writeParagraph("Pour les interventions à domicile ou le transfert inter-showrooms, l'application intègre un module de planification logistique :");

writeBulletPoint("Véhicules", "Suivi des statuts de la flotte de transport (Disponible, En course, En maintenance).");

writeBulletPoint("Missions de transport", "Assignation d'un chauffeur et d'un véhicule à une mission logistique liée à un ticket SAV, avec enregistrement des heures réelles de départ et d'arrivée.");

writeSubTitle("Workflow d'intégration de l'IA Gemini");
writeParagraph("L'application Horizon exploite la puissance des grands modèles de langage Gemini pour fluidifier les opérations quotidiennes et auditer l'activité :");

writeBulletPoint("Auto-catégorisation", "Gemini analyse automatiquement la description textuelle des pannes rédigée par le client pour renseigner instantanément la catégorie technique et évaluer le niveau d'urgence.");

writeBulletPoint("Templates de diagnostic", "L'IA propose aux techniciens des modèles de diagnostic et des procédures de réparation recommandées en fonction des symptômes de l'appareil.");

writeBulletPoint("Rapports Stratégiques IA", "Les dirigeants peuvent générer des audits financiers consolidés en un clic. Gemini agrège le chiffre d'affaires, les marges de réparation, la performance individuelle des techniciens et propose des recommandations d'optimisation commerciale.");

writeBulletPoint("Assistance virtuelle en boîte de réception", "Dans le module de messagerie unifiée (Inbox), Gemini assiste les agents pour reformuler les réponses clients ou traduire automatiquement les échanges.");

// Finalisation du PDF
const pdfBytes = doc.output('arraybuffer');
fs.writeFileSync('/Users/light/Documents/GitHub/Helpdesk-V2/Workflows_Royal_Plaza_Horizon.pdf', Buffer.from(pdfBytes));
console.log("PDF generated successfully at /Users/light/Documents/GitHub/Helpdesk-V2/Workflows_Royal_Plaza_Horizon.pdf");
