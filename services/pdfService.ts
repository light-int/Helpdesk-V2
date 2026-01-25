
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
