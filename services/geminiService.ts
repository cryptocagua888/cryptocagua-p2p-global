
import { GoogleGenAI } from "@google/genai";

export const isAiConfigured = () => {
  // Verificación más directa de la variable de entorno
  try {
    const key = process.env.API_KEY;
    return !!key && key.length > 0;
  } catch (e) {
    return false;
  }
};

export const generateDescription = async (title: string, category: string): Promise<string> => {
  if (!isAiConfigured()) return "Configuración de IA no detectada.";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Escribe una descripción de máximo 30 palabras en español para: ${title} (${category}). Que sea vendedora.`,
    });
    return response.text || "Descripción generada.";
  } catch (error) {
    return "Error al conectar con la IA.";
  }
};

export const analyzeOffer = async (offerDetails: string): Promise<string> => {
  if (!isAiConfigured()) return "La IA no está lista.";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza esta oferta P2P brevemente y dime: 1. Nivel de Riesgo, 2. Un consejo de seguridad. Detalles: ${offerDetails}`,
    });
    return response.text || "Análisis no disponible.";
  } catch (error) {
    return "Error en el análisis de IA.";
  }
};
