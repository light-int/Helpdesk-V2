
import { GoogleGenAI, Type } from "@google/genai";
import { OpenRouterService } from "./openRouterService";
import { SystemConfig } from "../types";
import { ApiService } from "./apiService";

// Cache basique pour la config
let cachedConfig: SystemConfig | null = null;
let cachedOpenRouterKey: string | null = null;

const refreshConfig = async () => {
  try {
    cachedConfig = await ApiService.config.get();
    const integrations = await ApiService.integrations.getConfigs();
    const openRouterConfig = integrations.find(i => i.id === 'openrouter');
    if (openRouterConfig && openRouterConfig.enabled) {
      cachedOpenRouterKey = openRouterConfig.apiKey || null;
    }
    console.log("AI Config Refreshed:", {
      provider: cachedConfig?.aiProvider,
      model: cachedConfig?.aiModel,
      hasOpenRouterKey: !!cachedOpenRouterKey
    });
  } catch (e) {
    console.warn("AI Service: Failed to refresh config", e);
  }
};

/**
 * Vérifie si le moteur IA est prêt à l'emploi.
 */
export const isAiOperational = async () => {
  if (!cachedConfig) await refreshConfig();

  const key = process.env.API_KEY;
  const hasGemini = !!key && key !== 'undefined' && key.length > 10;
  const hasOpenRouter = !!cachedOpenRouterKey && cachedOpenRouterKey.length > 10;

  return hasGemini || hasOpenRouter;
};

const getProvider = async () => {
  if (!cachedConfig) await refreshConfig();

  // Fallback sur Gemini si pas de config
  const provider = cachedConfig?.aiProvider || 'google';
  const model = cachedConfig?.aiModel || (provider === 'google' ? 'flash' : 'z-ai/glm-4.5-air:free');

  // Si OpenRouter demandé mais pas de clé, fallback sur Gemini si dispo
  if (provider === 'openrouter' && !cachedOpenRouterKey) {
    console.warn("OpenRouter selected but no key found. Falling back to Gemini.");
    return { provider: 'google', model: 'flash' };
  }

  return { provider, model, openRouterKey: cachedOpenRouterKey };
};

export const chatWithAI = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], modelType: 'flash' | 'pro' = 'flash') => {
  try {
    if (!(await isAiOperational())) {
      return "L'IA Horizon est actuellement en mode repos. Veuillez vérifier la configuration.";
    }

    const { provider, model, openRouterKey } = await getProvider();

    if (provider === 'openrouter' && openRouterKey) {
      return await OpenRouterService.chat(message, history, openRouterKey, model);
    }

    // Google Gemini Implementation
    // Override modelType if specifically requested (legacy compatibility)
    // But ideally we should respect the system config model unless it's a specific overrides
    const actualModel = modelType === 'pro' ? "gemini-3-pro-preview" : "gemini-3-flash-preview";

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat = ai.chats.create({
      model: actualModel,
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
    return "Connexion interrompue avec le moteur IA.";
  }
};

export const analyzeTicketDescription = async (description: string) => {
  if (!(await isAiOperational())) return { category: 'SAV', priority: 'Moyenne', summary: 'Analyse manuelle requise' };

  try {
    const { provider, model, openRouterKey } = await getProvider();

    if (provider === 'openrouter' && openRouterKey) {
      return await OpenRouterService.analyzeTicket(description, openRouterKey, model);
    }

    // Google Gemini Implementation
    const modelName = "gemini-3-flash-preview"; // Always fast for tickets
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

export const generateStrategicReport = async (data: any) => {
  if (!(await isAiOperational())) {
    return "# AUDIT INDISPONIBLE\n\nLe moteur d'intelligence nécessite une configuration active.";
  }

  try {
    const { provider, model, openRouterKey } = await getProvider();

    if (provider === 'openrouter' && openRouterKey) {
      return await OpenRouterService.generateReport(data, openRouterKey, model);
    }

    // Google Gemini Implementation
    const modelName = "gemini-3-flash-preview"; // Switch to Flash for speed
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      
      Utilise un ton expert, formel et visionnaire. Ne mentionne pas de Markdown technique mais utilise des titres, sous-titres and listes.`,
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
  if (!(await isAiOperational())) return text;

  try {
    const { provider, model, openRouterKey } = await getProvider();

    if (provider === 'openrouter' && openRouterKey) {
      return await OpenRouterService.translate(text, targetLang, openRouterKey, model);
    }

    // Google Gemini Implementation
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
