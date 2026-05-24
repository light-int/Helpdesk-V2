
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Service de génération PDF A4 haute définition.
 * Utilise une fenêtre virtuelle fixe de 794px pour correspondre au format 210mm.
 */
export const generatePDFFromElement = async (elementId: string, filename: string = 'rapport.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Attendre que les polices soient chargées
  await document.fonts.ready;

  // Résolution robuste du constructeur jsPDF
  // Dans certains environnements ESM, jsPDF est exporté directement ou via une propriété .jsPDF
  // @ts-ignore
  const JsPdfConstructor = jsPDF.jsPDF || jsPDF;

  if (typeof JsPdfConstructor !== 'function') {
    console.error('jsPDF constructor not found in this environment');
    return;
  }

  const doc = new (JsPdfConstructor as any)({
    orientation: 'p',
    unit: 'pt',
    format: 'a4',
  });

  const pdfWidth = doc.internal.pageSize.getWidth();

  try {
    await doc.html(element, {
      callback: function (doc: any) {
        doc.save(filename);
      },
      x: 0,
      y: 0,
      width: pdfWidth,
      windowWidth: 794,
      autoPaging: 'text',
      html2canvas: {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        letterRendering: true,
      }
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
};

export const generateTicketDossier = async (ticket: any) => {
  const filename = `SAV-PLAZA-${ticket.id}.pdf`;
  // On utilise l'élément racine du drawer configuré dans Tickets.tsx
  return generatePDFFromElement('ticket-drawer-content', filename);
};

interface InvoiceTemplate {
  id: string;
  name: string;
  type: 'QUOTATION' | 'INVOICE' | 'BOTH';
  isActive: boolean;
  headerContent: string;
  footerContent: string;
  termsConditions: string;
  logoUrl?: string;
  primaryColor?: string;
  fontFamily?: string;
}

interface InvoiceTicket {
  id: string;
  customerName: string;
  customerPhone?: string;
  brand?: string;
  productName?: string;
  category?: string;
  serialNumber?: string;
  description: string;
  createdAt: string;
  financials?: {
    partsTotal?: number;
    laborTotal?: number;
    travelFee?: number;
    discount?: number;
    grandTotal?: number;
    isPaid?: boolean;
    invoiceNumber?: string;
    advancePayments?: { amount: number; date: string; method: string; recordedBy?: string }[];
    remainingToPay?: number;
  };
  interventionReport?: {
    partsUsed?: { name: string; quantity: number; unitPrice?: number }[];
    detailedDiagnostic?: string;
    repairProcedure?: string;
  };
  quotation?: {
    status?: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
    prestations?: { name: string; fixedCost: number }[];
    totalAmount?: number;
  };
  showroom?: string;
}

interface InvoiceShowroom {
  address: string;
  phone: string;
  hours?: string;
}

function formatCurrency(value: number = 0): string {
  return value.toLocaleString('fr-FR') + ' FCFA';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Remplace les variables template par les valeurs du ticket.
 */
function replaceTemplateVars(content: string, ticket: InvoiceTicket): string {
  const invoiceDate = formatDate(new Date().toISOString());
  const totalParts = ticket.interventionReport?.partsUsed?.reduce((s, p) => s + (Number(p.quantity) || 1) * (Number(p.unitPrice) || 0), 0) || 0;
  const totalPrestations = ticket.quotation?.prestations?.reduce((s, p) => s + Number(p.fixedCost), 0) || 0;
  const grandTotal = (totalPrestations + totalParts - (ticket.financials?.discount || 0)) / 100;

  return content
    .replace(/\{\{client_nom\}\}/g, ticket.customerName || '')
    .replace(/\{\{client_tel\}\}/g, ticket.customerPhone || '')
    .replace(/\{\{ticket_id\}\}/g, ticket.id || '')
    .replace(/\{\{date\}\}/g, invoiceDate)
    .replace(/\{\{marque\}\}/g, ticket.brand || '')
    .replace(/\{\{modele\}\}/g, ticket.productName || ticket.category || '')
    .replace(/\{\{serie\}\}/g, ticket.serialNumber || 'N/A')
    .replace(/\{\{total\}\}/g, formatCurrency(grandTotal))
    .replace(/\{\{tech\}\}/g, (ticket as any).assignedTechnicianId || '');
}

/**
 * Construit le HTML de la facture selon le template configuré,
 * aligné sur le prévisualiseur A4 des paramètres documents.
 */
function buildInvoiceHTML(ticket: InvoiceTicket, template: InvoiceTemplate, showroom?: InvoiceShowroom): string {
  const color = template.primaryColor || '#3ecf8e';
  const font = template.fontFamily || 'Inter, system-ui, sans-serif';
  const logo = template.logoUrl || '';
  const invoiceNum = ticket.financials?.invoiceNumber || `FAC-${ticket.id}`;
  const invoiceDate = formatDate(new Date().toISOString());

  const resolvedHeader = replaceTemplateVars(template.headerContent || '', ticket);
  const resolvedFooter = replaceTemplateVars(template.footerContent || '', ticket);
  const resolvedTerms = replaceTemplateVars(template.termsConditions || '', ticket);

  // Lignes prestations (style prévisualiseur)
  const prestationsRows = (ticket.quotation?.prestations || [])
    .map(p => `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:24px 0; vertical-align:top;">
          <p style="font-size:12px; font-weight:800; color:#1c1c1c; text-transform:uppercase; margin:0;">${p.name}</p>
          <p style="font-size:11px; color:#9ca3af; font-weight:700; margin:4px 0 0 0; text-transform:uppercase; letter-spacing:0.5px;">Prestation technique certifiée</p>
        </td>
        <td style="padding:24px 0; text-align:center; vertical-align:middle; font-size:12px; font-weight:800; color:#1c1c1c;">1</td>
        <td style="padding:24px 0; text-align:right; vertical-align:middle; font-size:12px; font-weight:800; color:#1c1c1c;">${formatCurrency(Number(p.fixedCost))}</td>
      </tr>`)
    .join('');

  // Lignes pièces (style prévisualiseur)
  const partsRows = (ticket.interventionReport?.partsUsed || [])
    .map(p => {
      const total = (Number(p.quantity) || 1) * (Number(p.unitPrice) || 0);
      return `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:24px 0; vertical-align:top;">
          <p style="font-size:12px; font-weight:800; color:#1c1c1c; text-transform:uppercase; margin:0;">${p.name}</p>
          <p style="font-size:11px; color:#9ca3af; font-weight:700; margin:4px 0 0 0; text-transform:uppercase; letter-spacing:0.5px;">Pièce de rechange originale</p>
        </td>
        <td style="padding:24px 0; text-align:center; vertical-align:middle; font-size:12px; font-weight:800; color:#1c1c1c;">${p.quantity || 1}</td>
        <td style="padding:24px 0; text-align:right; vertical-align:middle; font-size:12px; font-weight:800; color:#1c1c1c;">${formatCurrency(total)}</td>
      </tr>`;
    })
    .join('');

  const partsTotal = ticket.interventionReport?.partsUsed?.reduce((s, p) => s + (Number(p.quantity) || 1) * (Number(p.unitPrice) || 0), 0) || 0;
  const subtotal = (ticket.quotation?.prestations?.reduce((s, p) => s + Number(p.fixedCost), 0) || 0) + partsTotal;
  const discount = ticket.financials?.discount || 0;
  const total = subtotal - discount;
  const advanceTotal = ticket.financials?.advancePayments?.reduce((s, a) => s + Number(a.amount), 0) || 0;
  const remaining = ticket.financials?.remainingToPay ?? (total - advanceTotal);

  const statusBadge = ticket.financials?.isPaid
    ? `<div style="display:inline-block; background:${color}; color:#fff; padding:6px 16px; border-radius:8px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Payé</div>`
    : `<div style="display:inline-block; background:#fffbeb; color:#b45309; padding:6px 16px; border-radius:8px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">En attente de paiement</div>`;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:${font}; color:#1c1c1c; background:#fff; width:794px; padding:20mm; }
</style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:40px; margin-bottom:40px; border-bottom:2px solid ${color}20;">
    <div style="max-width:55%;">
      ${logo ? `<img src="${logo}" style="max-height:112px; max-width:112px; object-fit:contain; border-radius:16px; border:1px solid #f0f0f0; display:block; margin-bottom:24px;" alt="logo" onerror="this.style.display='none'" />` : `<div style="width:112px; height:112px; background:#f8f9fa; border-radius:16px; border:1px solid #f0f0f0; display:flex; align-items:center; justify-content:center; margin-bottom:24px; color:#e2e2e2; font-size:14px; font-weight:800;">LOGO</div>`}
      <div style="margin-top:8px; line-height:1.6;">
        <h1 style="font-size:30px; font-weight:800; color:${color}; text-transform:uppercase; letter-spacing:-0.5px; margin:0;">Facture</h1>
        <p style="font-size:12px; font-weight:800; color:#686868; text-transform:uppercase; letter-spacing:0.2em; opacity:0.4; margin-top:4px;">N° ${invoiceNum}</p>
      </div>
    </div>
    <div style="text-align:right; font-size:12px; font-weight:700; color:#1c1c1c; line-height:1.8; text-transform:uppercase; max-width:300px; white-space:pre-line;">
      ${resolvedHeader || (showroom ? `${showroom.address}\n${showroom.phone}` : 'VOTRE ENTREPRISE\nAdresse, Téléphone')}
    </div>
  </div>

  <!-- Client & Metadata -->
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:64px; margin-bottom:64px;">
    <div>
      <p style="font-size:11px; font-weight:800; color:#9ca3af; text-transform:uppercase; letter-spacing:0.3em; margin-bottom:16px;">Destinataire</p>
      <div style="padding:24px; background:#f8f9fa; border-radius:16px; border:1px solid #f0f0f0;">
        <p style="font-size:14px; font-weight:800; color:#1c1c1c; text-transform:uppercase; margin:0;">${ticket.customerName}</p>
        <p style="font-size:14px; font-weight:700; color:#686868; margin:4px 0 0 0;">${ticket.customerPhone || ''}</p>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="display:inline-block; background:${color}; color:#fff; padding:6px 16px; border-radius:8px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:16px;">Information</div>
      <div style="padding-top:12px; line-height:1.8;">
        <p style="font-size:12px; font-weight:700; color:#686868; text-transform:uppercase; letter-spacing:0.5px; margin:0;">Émis le: <span style="color:#1c1c1c;">${invoiceDate}</span></p>
        <p style="font-size:12px; font-weight:700; color:#686868; text-transform:uppercase; letter-spacing:0.5px; margin:0;">Appareil: <span style="color:#1c1c1c;">${ticket.brand || ''} ${ticket.productName || ticket.category || ''}</span></p>
        <p style="font-size:12px; font-weight:700; color:#686868; text-transform:uppercase; letter-spacing:0.5px; margin:0;">N° Série: <span style="color:#1c1c1c;">${ticket.serialNumber || 'N/A'}</span></p>
        <div style="margin-top:12px;">${statusBadge}</div>
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <div style="margin-bottom:64px;">
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:4px solid ${color};">
          <th style="width:66%; padding:16px 0; text-align:left; font-size:12px; font-weight:800; color:#1c1c1c; text-transform:uppercase; letter-spacing:0.15em;">Désignation des Travaux</th>
          <th style="width:17%; padding:16px 0; text-align:center; font-size:12px; font-weight:800; color:#1c1c1c; text-transform:uppercase; letter-spacing:0.15em;">Qté</th>
          <th style="width:17%; padding:16px 0; text-align:right; font-size:12px; font-weight:800; color:#1c1c1c; text-transform:uppercase; letter-spacing:0.15em;">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${prestationsRows}
        ${partsRows}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div style="display:flex; justify-content:flex-end; margin-bottom:80px;">
    <div style="width:288px; padding-top:24px; border-top:2px solid ${color}40;">
      <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; color:#686868; text-transform:uppercase; letter-spacing:0.1em; padding:8px 0;">
        <span>Sous-Total</span>
        <span style="color:#1c1c1c;">${formatCurrency(subtotal)}</span>
      </div>
      ${discount > 0 ? `
      <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; color:#dc2626; text-transform:uppercase; letter-spacing:0.1em; padding:8px 0;">
        <span>Remise</span>
        <span>-${formatCurrency(discount)}</span>
      </div>` : ''}
      ${advanceTotal > 0 ? `
      <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; color:#16a34a; text-transform:uppercase; letter-spacing:0.1em; padding:8px 0;">
        <span>Acompte versé</span>
        <span>-${formatCurrency(advanceTotal)}</span>
      </div>` : ''}
      <div style="display:flex; justify-content:space-between; align-items:center; padding-top:16px; margin-top:8px; border-top:1px solid #f0f0f0;">
        <span style="font-size:13px; font-weight:800; color:#1c1c1c; text-transform:uppercase; letter-spacing:0.2em;">Net à Payer</span>
        <span style="font-size:20px; font-weight:800; color:${color};">${formatCurrency(total)}</span>
      </div>
      ${!ticket.financials?.isPaid && remaining > 0 ? `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#fffbeb; border-radius:8px; margin-top:12px;">
        <span style="font-size:12px; font-weight:800; color:#b45309; text-transform:uppercase;">Reste à payer</span>
        <span style="font-size:14px; font-weight:800; color:#b45309;">${formatCurrency(remaining)}</span>
      </div>` : ''}
    </div>
  </div>

  <!-- Terms & Conditions -->
  ${resolvedTerms ? `
  <div style="margin-top:auto; padding-top:40px; border-top:1px solid #f0f0f0;">
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
      <div style="width:24px; height:4px; border-radius:2px; background:${color};"></div>
      <span style="font-size:11px; font-weight:800; color:#1c1c1c; text-transform:uppercase; letter-spacing:0.3em;">Observations Légales</span>
    </div>
    <p style="font-size:11px; color:#686868; font-weight:700; line-height:1.8; text-transform:uppercase; opacity:0.8; white-space:pre-line; padding-left:8px; border-left:2px solid #f0f0f0; font-style:italic;">${resolvedTerms}</p>
  </div>` : ''}

  <!-- Footer -->
  ${resolvedFooter ? `
  <div style="padding-top:40px; text-align:center;">
    <p style="font-size:10px; color:#9ca3af; font-weight:800; text-transform:uppercase; letter-spacing:0.4em; line-height:2; white-space:pre-line;">${resolvedFooter}</p>
  </div>` : ''}
</body>
</html>`;
}

/**
 * Génère un PDF facture à partir d'un ticket en appliquant le template de document actif.
 * @param ticket Le ticket à facturer
 * @param templates Liste des templates disponibles (récupérée via useData)
 * @param showroom Informations du showroom (optionnel)
 * @returns Promise<void>
 */
export const generateInvoicePDF = async (
  ticket: InvoiceTicket,
  templates: InvoiceTemplate[],
  showroom?: InvoiceShowroom
): Promise<void> => {
  const isApproved = ticket.quotation?.status === 'Approved';
  const activeTemplate = templates.find(t =>
    (isApproved
      ? (t.type === 'INVOICE' || t.type === 'BOTH')
      : (t.type === 'QUOTATION' || t.type === 'BOTH'))
    && t.isActive
  );
  if (!activeTemplate) {
    throw new Error('Aucun template de facture actif trouvé. Veuillez configurer un template dans les paramètres.');
  }

  const html = buildInvoiceHTML(ticket, activeTemplate, showroom);
  const containerId = 'invoice-print-container';

  // Créer un élément temporaire invisible
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);
  }
  container.innerHTML = html;

  // Attendre le chargement des images
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 300));

  const filename = `FACTURE-${ticket.financials?.invoiceNumber || ticket.id}.pdf`;

  await generatePDFFromElement(containerId, filename);

  // Nettoyage différé
  setTimeout(() => { if (container) container.innerHTML = ''; }, 2000);
};

/**
 * Ouvre une fenêtre d'impression avec la facture stylée selon le template.
 * @param ticket Le ticket à facturer
 * @param templates Liste des templates disponibles
 * @param showroom Informations du showroom (optionnel)
 */
export const printInvoice = (
  ticket: InvoiceTicket,
  templates: InvoiceTemplate[],
  showroom?: InvoiceShowroom
): void => {
  const isApproved = ticket.quotation?.status === 'Approved';
  const activeTemplate = templates.find(t =>
    (isApproved
      ? (t.type === 'INVOICE' || t.type === 'BOTH')
      : (t.type === 'QUOTATION' || t.type === 'BOTH'))
    && t.isActive
  );
  if (!activeTemplate) {
    alert('Aucun template de facture actif trouvé. Veuillez configurer un template dans les paramètres.');
    return;
  }

  const html = buildInvoiceHTML(ticket, activeTemplate, showroom);
  const printWindow = window.open('', '_blank', 'width=850,height=1100');
  if (!printWindow) {
    alert('Veuillez autoriser les pop-ups pour imprimer la facture.');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Attendre le rendu avant d'imprimer
  printWindow.onload = () => {
    printWindow.print();
  };
  // Fallback si onload ne se déclenche pas
  setTimeout(() => {
    try { printWindow.print(); } catch { /* ignore */ }
  }, 800);
};
