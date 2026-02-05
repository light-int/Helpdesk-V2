
import { GoogleGenAI, Type } from "@google/genai";
import { ApiService } from "./apiService";

const SYSTEM_INSTRUCTION = `Tu es l'assistant IA 2026 de Royal Plaza à Libreville, Gabon. 
Tu aides les clients et le personnel avec :
1. Horaires : Lun-Sam 8h30-18h30 (Glass, Oloumi, Bord de mer).
2. Stocks : Canapés, frigos LG/Beko, splits.
3. Statut commande : Demande le numéro de ticket (ex: T-1001).
4. SAV : Rappelle que les garanties LG sont de 1 an.
Réponds de manière professionnelle, chaleureuse et courte en français.`;

/**
 * Vérifie si le moteur Gemini est prêt.
 */
export const isAiOperational = () => {
  const key = process.env.API_KEY;
  return !!key && key.length > 10;
};

/**
 * Appel générique à l'IA (Switch entre Gemini et OpenRouter)
 */
export const chatWithAI = async (message: string, history: any[], config: any) => {
  if (config.aiProvider === 'openrouter') {
    return await callOpenRouter(message, history, config.aiModel);
  } else {
    return await callGemini(message, history, config.aiModel);
  }
};

/**
 * Implémentation native Google Gemini
 */
const callGemini = async (message: string, history: any[], modelType: string) => {
  try {
    if (!isAiOperational()) return "IA Gemini non configurée.";
    
    const modelName = modelType === 'pro' ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erreur Gemini. Basculez sur OpenRouter dans les paramètres si nécessaire.";
  }
};

/**
 * Implémentation OpenRouter (Support Qwen, DeepSeek, etc.)
 */
const callOpenRouter = async (message: string, history: any[], model: string) => {
  try {
    const integrations = await ApiService.integrations.getConfigs();
    const orConfig = integrations.find(i => i.id === 'openrouter');
    
    if (!orConfig?.enabled || !orConfig?.apiKey) {
      return "OpenRouter n'est pas activé ou la clé API est manquante dans Paramètres > Gateway.";
    }

    // Mapping sécurisé de l'historique (évite l'erreur 'reading 0 of undefined')
    const formattedHistory = (history || []).map(h => {
      const content = h.parts && h.parts[0] ? h.parts[0].text : "";
      return { 
        role: h.role === 'model' ? 'assistant' : 'user', 
        content: content 
      };
    }).filter(h => h.content !== "");

    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION },
      ...formattedHistory,
      { role: "user", content: message }
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${orConfig.apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Royal Plaza Horizon",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model || "qwen/qwen3-next-80b-a3b-instruct:free",
        messages: messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenRouter API Error:", errorData);
      return `Erreur OpenRouter (${response.status}) : ${errorData.error?.message || "Échec de la requête"}`;
    }

    const data = await response.json();

    // Validation profonde de la réponse pour éviter les crashs JS
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }

    if (data.error) {
      return `Erreur API : ${data.error.message}`;
    }

    return "Réponse vide reçue de l'IA. Vérifiez votre crédit OpenRouter.";
  } catch (error) {
    console.error("OpenRouter Connection Error:", error);
    return "Échec critique de la liaison avec OpenRouter. Vérifiez votre connexion internet.";
  }
};

/**
 * Analyse la description d'un ticket pour suggérer catégorie et priorité.
 */
export const analyzeTicketDescription = async (description: string, config: any) => {
  if (config.aiProvider === 'openrouter') {
      return { category: 'SAV', priority: 'Moyenne', summary: 'Analyse via OpenRouter en attente' };
  }
  
  if (!isAiOperational()) return { category: 'SAV', priority: 'Moyenne', summary: 'Analyse manuelle' };
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: config.aiModel === 'pro' ? "gemini-3-pro-preview" : "gemini-3-flash-preview",
      contents: `Analyse ce ticket de SAV et suggère une catégorie et une priorité en JSON: ${description}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            priority: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["category", "priority", "summary"],
          propertyOrdering: ["category", "priority", "summary"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { category: 'SAV', priority: 'Moyenne', summary: 'Nouveau ticket' };
  }
};

/**
 * Génère un rapport stratégique basé sur les KPIs financiers.
 */
export const generateStrategicReport = async (data: any, config: any) => {
  if (config.aiProvider === 'openrouter') {
      return "# AUDIT STRATÉGIQUE\n\nGénéré via OpenRouter. Analyse en cours...";
  }

  if (!isAiOperational()) return "# AUDIT STRATÉGIQUE\n\nIntelligence Artificielle non configurée.";

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = config.aiModel === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    const prompt = `Génère un rapport d'audit stratégique pour Royal Plaza Libreville basé sur ces indicateurs de performance : 
    CA: ${data.ca} F, Marge: ${data.marge} F, Volume tickets: ${data.volume}, Pièces: ${data.parts} F, Main d'œuvre: ${data.labor} F.
    Inclus une analyse de rentabilité, des recommandations opérationnelles et des perspectives de croissance.
    Formatte la réponse en Markdown propre.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "Tu es un consultant expert en stratégie financière pour Royal Plaza, leader de l'électroménager au Gabon.",
        temperature: 0.2,
      }
    });

    return response.text || "Impossible de générer le rapport.";
  } catch (e) {
    console.error("Gemini Audit Error:", e);
    return "# ERREUR D'AUDIT\n\nLe moteur Gemini n'a pas pu traiter les données stratégiques.";
  }
};
