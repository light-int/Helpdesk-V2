
import { GoogleGenAI, Type } from "@google/genai";

// We do not initialize at the top level to avoid crashing the app on boot 
// if process.env.API_KEY is not yet defined by the build system.

export const chatWithAI = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  try {
    if (!process.env.API_KEY || process.env.API_KEY === 'undefined') {
      throw new Error("Clé API Gemini manquante.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: (h.role === 'user' ? 'user' : 'model') as any, parts: h.parts })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: `Tu es l'assistant IA 2026 de Royal Plaza à Libreville, Gabon. 
        Tu aides les clients et le personnel avec :
        1. Horaires : Lun-Sam 8h30-18h30 (Glass, Oloumi, Bord de mer).
        2. Stocks : Canapés, frigos LG/Beko, splits.
        3. Statut commande : Demande le numéro de ticket (ex: T-1001).
        4. SAV : Rappelle que les garanties LG sont de 1 an.
        Réponds de manière professionnelle, chaleureuse et courte en français.`,
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "L'assistant IA est actuellement indisponible (Clé API manquante ou invalide).";
  }
};

export const analyzeTicketDescription = async (description: string) => {
  try {
    if (!process.env.API_KEY || process.env.API_KEY === 'undefined') return null;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse ce ticket de SAV et suggère une catégorie (Livraison, Installation, SAV, Remboursement) et une priorité (Basse, Moyenne, Haute, Urgent). Réponds en JSON. Ticket: ${description}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            priority: { type: Type.STRING },
            summary: { type: Type.STRING, description: "Un résumé court de 5 mots" }
          },
          required: ["category", "priority", "summary"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return { category: 'SAV', priority: 'Moyenne', summary: 'Nouveau ticket' };
  }
};

export const generateStrategicReport = async (data: any) => {
  try {
    if (!process.env.API_KEY || process.env.API_KEY === 'undefined') {
      return "Échec de l'audit : Clé API Gemini non configurée dans l'environnement de déploiement.";
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Génère un rapport stratégique exécutif pour Royal Plaza Gabon basé sur ces indicateurs : ${JSON.stringify(data)}. 
      
      STRUCTURE DE TEXTE REQUISE (Format Office) :
      # AUDIT STRATÉGIQUE DES OPÉRATIONS SAV - [MOIS/ANNÉE]
      
      ## 1. SYNTHÈSE ANALYTIQUE DES PERFORMANCES
      [Écris une analyse globale des revenus et des volumes ici]
      
      ## 2. EXAMEN TECHNIQUE ET RENTABILITÉ
      [Détaille les performances des experts techniques et des showrooms]
      
      ## 3. IDENTIFICATION DES POINTS DE VIGILANCE
      [Liste à puces des anomalies ou retards identifiés]
      
      ## 4. RECOMMANDATIONS ET AXES DE CROISSANCE
      [Liste numérotée d'actions concrètes pour le mois prochain]
      
      Utilise un ton expert, formel et visionnaire. Ne mentionne pas de Markdown technique mais utilise des titres, sous-titres et listes.`,
      config: {
        systemInstruction: "Tu es un consultant senior en stratégie retail expert du marché gabonais. Tu rédiges des rapports destinés à la direction générale de Royal Plaza.",
        temperature: 0.85,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Strategic Report Error:", error);
    return "Échec de la génération du rapport stratégique.";
  }
};

export const translateContent = async (text: string, targetLang: 'EN' | 'FR') => {
  try {
    if (!process.env.API_KEY || process.env.API_KEY === 'undefined') return text;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Traduis le texte suivant en ${targetLang === 'EN' ? 'Anglais' : 'Français'}. 
      Il s'agit d'un contexte professionnel technique (Retail, SAV, Maintenance technique, Meubles, Électroménager). 
      Respecte la terminologie métier. 
      Texte à traduire : ${text}`,
      config: {
        systemInstruction: "Tu es un traducteur expert technique spécialisé dans le secteur du retail et de la maintenance.",
        temperature: 0.3,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Translation Error:", error);
    return text;
  }
};
