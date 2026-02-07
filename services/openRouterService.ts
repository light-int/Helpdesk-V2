import { SystemConfig } from '../types';

export const OpenRouterService = {
    // Chat avec l'IA
    chat: async (message: string, history: any[], apiKey: string, model: string) => {
        try {
            console.log("OpenRouter Chat Request:", { model, msgLength: message.length });
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://royalplaza.ga", // Site Id (Optionnel)
                    "X-Title": "Royal Plaza Helpdesk", // Titre App (Optionnel)
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: "system",
                            content: `Tu es l'assistant IA 2026 de Royal Plaza à Libreville, Gabon. 
              Tu aides les clients et le personnel avec :
              1. Horaires : Lun-Sam 8h30-18h30 (Glass, Oloumi, Bord de mer).
              2. Stocks : Canapés, frigos LG/Beko, splits.
              3. Statut commande : Demande le numéro de ticket (ex: T-1001).
              4. SAV : Rappelle que les garanties LG sont de 1 an.
              Réponds de manière professionnelle, chaleureuse et courte en français.`
                        },
                        ...history.map(h => ({
                            role: h.role === 'model' ? 'assistant' : 'user',
                            content: h.parts[0].text
                        })),
                        { role: "user", content: message }
                    ]
                })
            });

            const data = await response.json();
            if (!response.ok || data.error) {
                console.error("OpenRouter API Error:", data);
                throw new Error(data.error?.message || `Erreur OpenRouter: ${response.status}`);
            }
            return data.choices[0].message.content;
        } catch (e) {
            console.error("OpenRouter Chat Exception:", e);
            return "Désolé, je ne peux pas me connecter au cerveau OpenRouter pour le moment.";
        }
    },

    // Analyse de ticket (JSON)
    analyzeTicket: async (description: string, apiKey: string, model: string) => {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: "system",
                            content: `Analyse ce ticket de SAV. Réponds UNIQUEMENT avec un JSON valide.
              Format attendu : {"category": "...", "priority": "...", "summary": "..."}
              Categories possibles: Livraison, Installation, SAV, Remboursement.
              Priorités possibles: Basse, Moyenne, Haute, Urgent.`
                        },
                        { role: "user", content: `Ticket: ${description}` }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            const content = data.choices[0].message.content;
            return JSON.parse(content);
        } catch (e) {
            console.error("OpenRouter Analysis Error:", e);
            return { category: 'SAV', priority: 'Moyenne', summary: 'Analyse manuelle requise (Erreur IA)' };
        }
    },

    // Traduction
    translate: async (text: string, targetLang: 'EN' | 'FR', apiKey: string, model: string) => {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: "system",
                            content: "Tu es un traducteur expert technique spécialisé dans le retail et le SAV au Gabon."
                        },
                        {
                            role: "user",
                            content: `Traduis ceci en ${targetLang === 'EN' ? 'Anglais' : 'Français'} : "${text}"`
                        }
                    ]
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (e) {
            console.error("OpenRouter Translate Error:", e);
            return text;
        }
    },

    // Rapport Stratégique
    generateReport: async (data: any, apiKey: string, model: string) => {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: "system",
                            content: "Tu es un consultant senior en stratégie retail expert du marché gabonais."
                        },
                        {
                            role: "user",
                            content: `Génère un rapport stratégique exécutif pour Royal Plaza Gabon basé sur ces indicateurs : ${JSON.stringify(data)}.
              
              STRUCTURE REQUISE (Markdown) :
              # AUDIT STRATÉGIQUE
              ## 1. SYNTHÈSE
              ## 2. EXAMEN TECHNIQUE
              ## 3. VIGILANCE
              ## 4. RECOMMANDATIONS
              `
                        }
                    ]
                })
            });

            const result = await response.json();
            return result.choices[0].message.content;
        } catch (e) {
            console.error("OpenRouter Report Error:", e);
            return "# Erreur de génération\nImpossible de joindre OpenRouter.";
        }
    }
};
