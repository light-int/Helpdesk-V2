
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Vérifie si le moteur IA est prêt à l'emploi.
 * L'application ne doit pas planter si cette fonction retourne false.
 */
export const isAiOperational = () => {
  const key = process.env.API_KEY;
  return !!key && key !== 'undefined' && key !== 'votre_cle_gemini_ici' && key.length > 10;
};

export const chatWithAI = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], modelType: 'flash' | 'pro' = 'flash') => {
  try {
    if (!isAiOperational()) {
      return "L'IA Horizon est actuellement en mode repos (Clé API non configurée). Vous pouvez toujours utiliser toutes les fonctions de gestion SAV manuellement.";
    }
    
    const modelName = modelType === 'pro' ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const chat = ai.chats.create({
      model: modelName,
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
      history: history.map(h => ({
        role: h.role,
        parts: h.parts
      }))
    });

    const response = await chat.sendMessage({ message: message });
    return response.text;
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "Connexion interrompue avec le moteur IA. Veuillez vérifier votre connexion internet.";
  }
};

export const analyzeTicketDescription = async (description: string, modelType: 'flash' | 'pro' = 'flash') => {
  if (!isAiOperational()) return { category: 'SAV', priority: 'Moyenne', summary: 'Analyse manuelle requise' };

  try {
    const modelName = modelType === 'pro' ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const response = await ai.models.generateContent({
      model: modelName,
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

export const generateStrategicReport = async (data: any, modelType: 'flash' | 'pro' = 'pro') => {
  if (!isAiOperational()) {
    return "# AUDIT INDISPONIBLE\n\nLe moteur d'intelligence stratégique nécessite une clé API active pour compiler ces données.";
  }

  try {
    // Les rapports utilisent toujours Pro si disponible, sinon Flash
    const modelName = modelType === 'pro' ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const response = await ai.models.generateContent({
      model: modelName,
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
  if (!isAiOperational()) return text;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
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
